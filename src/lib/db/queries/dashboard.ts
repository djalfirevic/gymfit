import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { expenses, payments, storeSales } from '@/lib/db/schema'
import { getExchangeRate } from './settings'

export type MonthlyRollup = { month: number; zarada: number; troskovi: number; stanje: number; podela: number }

export function computeMonthRollup(zarada: number, troskovi: number): { stanje: number; podela: number } {
  const stanje = zarada - troskovi
  return { stanje, podela: stanje / 2 }
}

export function computeYearlyEurTotals(
  rows: { zarada: number; podela: number }[],
  rate: number,
): { ukupnaZaradaEur: number; zaradaEur: number } {
  if (!(rate > 0)) {
    throw new Error(`Invalid RSD→EUR rate: ${rate}`)
  }
  // "Ukupna zarada" is gross income (Zarada) converted to EUR — NOT net-of-
  // expenses Stanje. Confirmed against the source spreadsheet's own formula
  // (SUM(Zarada column) / rate); a table before this fix used Stanje here,
  // which understated the figure by roughly the year's total expenses.
  const zaradaSum = rows.reduce((sum, row) => sum + row.zarada, 0)
  const podelaSum = rows.reduce((sum, row) => sum + row.podela, 0)
  return { ukupnaZaradaEur: zaradaSum / rate, zaradaEur: podelaSum / rate }
}

async function monthlyIncome(year: number): Promise<Map<number, number>> {
  const paymentRows = (await db.execute(sql`
    select extract(month from ${payments.paidAt})::int as month, sum(${payments.amount})::numeric as total
    from ${payments}
    where extract(year from ${payments.paidAt}) = ${year}
    group by month
  `)) as unknown as { month: number; total: string }[]
  const saleRows = (await db.execute(sql`
    select extract(month from ${storeSales.soldAt})::int as month,
           sum(${storeSales.price} * ${storeSales.quantity})::numeric as total
    from ${storeSales}
    where extract(year from ${storeSales.soldAt}) = ${year}
    group by month
  `)) as unknown as { month: number; total: string }[]
  const income = new Map<number, number>()
  for (const row of [...paymentRows, ...saleRows]) {
    income.set(row.month, (income.get(row.month) ?? 0) + Number(row.total))
  }
  return income
}

async function monthlyExpenseTotals(year: number): Promise<Map<number, number>> {
  const rows = (await db.execute(sql`
    select extract(month from ${expenses.expenseDate})::int as month, sum(${expenses.amount})::numeric as total
    from ${expenses}
    where extract(year from ${expenses.expenseDate}) = ${year}
    group by month
  `)) as unknown as { month: number; total: string }[]
  const totals = new Map<number, number>()
  for (const row of rows) {
    totals.set(row.month, Number(row.total))
  }
  return totals
}

export async function monthlyRollup(year: number): Promise<MonthlyRollup[]> {
  const [income, expenseTotals] = await Promise.all([monthlyIncome(year), monthlyExpenseTotals(year)])
  const result: MonthlyRollup[] = []
  for (let month = 1; month <= 12; month++) {
    const zarada = income.get(month) ?? 0
    const troskovi = expenseTotals.get(month) ?? 0
    const { stanje, podela } = computeMonthRollup(zarada, troskovi)
    result.push({ month, zarada, troskovi, stanje, podela })
  }
  return result
}

export async function yearlyTotalsEur(year: number): Promise<{ ukupnaZaradaEur: number; zaradaEur: number }> {
  const rows = await monthlyRollup(year)
  const rate = await getExchangeRate()
  return computeYearlyEurTotals(rows, rate)
}
