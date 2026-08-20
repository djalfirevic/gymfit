import { asc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { expenses, members, payments, storeProducts, storeSales } from '@/lib/db/schema'
import { totalInvestedEur } from '@/lib/db/queries/investments'
import { getExchangeRate } from '@/lib/db/queries/settings'
import { buildWorkbook, type ExportData } from '@/lib/export/workbook'

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const FIRST_YEAR = 2024

function yearsCovered(dates: Date[]): number[] {
  const latest = dates.reduce(
    (max, date) => Math.max(max, date.getUTCFullYear()),
    new Date().getUTCFullYear(),
  )
  const years: number[] = []
  for (let year = FIRST_YEAR; year <= latest; year += 1) years.push(year)
  return years
}

export async function GET() {
  // A sale carries only a product id; the sheet wants the name, and quantity is
  // expanded into one row per unit to match how the source workbook recorded it.
  const [memberRows, paymentRows, saleRows, expenseRows, productRows, investedEur, rate] =
    await Promise.all([
      db.select().from(members).orderBy(asc(members.fullName)),
      db.select().from(payments).orderBy(asc(payments.paidAt)),
      db.select().from(storeSales).orderBy(asc(storeSales.soldAt)),
      db.select().from(expenses).orderBy(asc(expenses.expenseDate)),
      db.select().from(storeProducts),
      totalInvestedEur(),
      getExchangeRate(),
    ])

  const productNameById = new Map(productRows.map((product) => [product.id, product.name]))

  const sales: ExportData['sales'] = []
  for (const sale of saleRows) {
    const productName = productNameById.get(sale.productId) ?? 'Nepoznato'
    const unitPrice = Number(sale.price)
    const quantity = sale.quantity ?? 1
    for (let unit = 0; unit < quantity; unit += 1) {
      sales.push({ productName, soldAt: sale.soldAt, price: unitPrice })
    }
  }

  const data: ExportData = {
    members: memberRows.map((member) => ({
      fullName: member.fullName,
      membershipRenewalDate: member.membershipRenewalDate,
    })),
    payments: paymentRows.map((payment) => ({
      memberNameRaw: payment.memberNameRaw,
      paidAt: payment.paidAt,
      amount: Number(payment.amount),
    })),
    sales,
    expenses: expenseRows.map((expense) => ({
      expenseDate: expense.expenseDate,
      description: expense.description,
      amount: Number(expense.amount),
    })),
    investedEur,
    years: yearsCovered([
      ...paymentRows.map((row) => row.paidAt),
      ...saleRows.map((row) => row.soldAt),
      ...expenseRows.map((row) => row.expenseDate),
    ]),
    rsdToEurRate: rate,
  }

  const workbook = buildWorkbook(data)
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `GymFit ${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
