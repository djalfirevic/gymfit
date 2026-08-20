// scripts/sync-expenses.ts
// Same reasoning as sync-payments.ts / sync-store.ts: an expense description
// can legitimately repeat on the same day at the same amount (e.g. two
// identical supply restocks), so this groups both the CSV and the database
// by (description, date, amount) and inserts however many more the CSV has
// than the database already does, per group. New rows are auto-categorized
// the same way seed-import.ts does.
import './load-env'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { db } from './db-client'
import { expenses } from '../src/lib/db/schema'
import { categorizeExpense } from '../src/lib/expenses/categorize'

function parseSerbianDate(raw: string): Date {
  const [day, month, year] = raw.trim().split('.').map(Number)
  if (!day || !month || !year) {
    throw new Error(`Cannot parse date: "${raw}"`)
  }
  const fullYear = year < 100 ? 2000 + year : year
  return new Date(Date.UTC(fullYear, month - 1, day))
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function expenseKey(description: string, expenseDate: Date, amount: string): string {
  return `${description}|${toDateKey(expenseDate)}|${Number(amount)}`
}

async function main(): Promise<void> {
  const csvPathArgIndex = process.argv.indexOf('--file')
  const csvPath = csvPathArgIndex >= 0 ? process.argv[csvPathArgIndex + 1] : undefined
  if (!csvPath) {
    console.error('Usage: pnpm sync:expenses -- --file "/path/to/Expenses.csv"')
    process.exit(1)
  }

  const content = readFileSync(resolve(csvPath), 'utf-8')
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]

  type ParsedRow = { description: string; expenseDate: Date; amount: string }
  const csvRows: ParsedRow[] = []
  for (const row of rows) {
    const dateRaw = row['Datum']
    const description = row['Naziv']
    const amountRaw = row['Cena']
    if (!dateRaw || !description || !amountRaw) continue
    csvRows.push({ description, expenseDate: parseSerbianDate(dateRaw), amount: amountRaw })
  }

  const csvGroups = new Map<string, ParsedRow[]>()
  for (const row of csvRows) {
    const key = expenseKey(row.description, row.expenseDate, row.amount)
    const group = csvGroups.get(key)
    if (group) group.push(row)
    else csvGroups.set(key, [row])
  }

  const existingExpenses = await db
    .select({ description: expenses.description, expenseDate: expenses.expenseDate, amount: expenses.amount })
    .from(expenses)
  const dbCounts = new Map<string, number>()
  for (const row of existingExpenses) {
    const key = expenseKey(row.description, new Date(row.expenseDate), row.amount)
    dbCounts.set(key, (dbCounts.get(key) ?? 0) + 1)
  }

  const toInsert: ParsedRow[] = []
  for (const [key, group] of csvGroups) {
    const already = dbCounts.get(key) ?? 0
    const missing = group.length - already
    if (missing > 0) toInsert.push(...group.slice(already, group.length))
  }

  if (toInsert.length === 0) {
    console.log('No new expenses found — database already matches the CSV.')
    process.exit(0)
  }

  console.log(`Found ${toInsert.length} new expense(s) out of ${csvRows.length} valid CSV rows.`)

  const categoryCounts: Record<string, number> = {}
  await db.transaction(async (tx) => {
    for (const row of toInsert) {
      const category = categorizeExpense(row.description)
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1
      await tx.insert(expenses).values({
        expenseDate: row.expenseDate,
        description: row.description,
        amount: row.amount,
        category,
      })
    }
  })

  console.log(`Inserted ${toInsert.length} new expense(s).`)
  console.log('New expenses by category:', categoryCounts)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
