// scripts/sync-payments.ts
// Payments have no natural unique key (the same member can legitimately pay
// the same amount on the same day more than once), so this can't just check
// "does this row exist?" -- that would either skip real duplicates or, if
// keyed too loosely, re-insert rows that are already there. Instead it
// groups both the CSV and the database by (member, date, amount) and, per
// group, inserts however many more the CSV has than the database already
// does. Safe to re-run: if nothing changed, every group's counts already
// match and nothing is inserted.
import './load-env'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { db } from './db-client'
import { members, payments } from '../src/lib/db/schema'
import { matchMemberIdByName, normalizeName } from '../src/lib/import/match-member'

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

function paymentKey(memberNameRaw: string, paidAt: Date, amount: string): string {
  return `${normalizeName(memberNameRaw)}|${toDateKey(paidAt)}|${Number(amount)}`
}

async function main(): Promise<void> {
  const csvPathArgIndex = process.argv.indexOf('--file')
  const csvPath = csvPathArgIndex >= 0 ? process.argv[csvPathArgIndex + 1] : undefined
  if (!csvPath) {
    console.error('Usage: pnpm sync:payments -- --file "/path/to/Payments.csv"')
    process.exit(1)
  }

  const content = readFileSync(resolve(csvPath), 'utf-8')
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]

  type ParsedRow = { memberNameRaw: string; paidAt: Date; amount: string }
  const csvRows: ParsedRow[] = []
  for (const row of rows) {
    const memberNameRaw = row['Član']
    const dateRaw = row['Datum']
    const amountRaw = row['Cena']
    if (!memberNameRaw || !dateRaw || !amountRaw) continue
    csvRows.push({ memberNameRaw, paidAt: parseSerbianDate(dateRaw), amount: amountRaw })
  }

  const csvGroups = new Map<string, ParsedRow[]>()
  for (const row of csvRows) {
    const key = paymentKey(row.memberNameRaw, row.paidAt, row.amount)
    const group = csvGroups.get(key)
    if (group) group.push(row)
    else csvGroups.set(key, [row])
  }

  const existingPayments = await db
    .select({ memberNameRaw: payments.memberNameRaw, paidAt: payments.paidAt, amount: payments.amount })
    .from(payments)
  const dbCounts = new Map<string, number>()
  for (const row of existingPayments) {
    const key = paymentKey(row.memberNameRaw, new Date(row.paidAt), row.amount)
    dbCounts.set(key, (dbCounts.get(key) ?? 0) + 1)
  }

  const toInsert: ParsedRow[] = []
  for (const [key, group] of csvGroups) {
    const already = dbCounts.get(key) ?? 0
    const missing = group.length - already
    if (missing > 0) toInsert.push(...group.slice(already, group.length))
  }

  if (toInsert.length === 0) {
    console.log('No new payments found — database already matches the CSV.')
    process.exit(0)
  }

  console.log(`Found ${toInsert.length} new payment(s) out of ${csvRows.length} valid CSV rows.`)

  const roster = await db.select({ id: members.id, fullName: members.fullName }).from(members)
  const unmatched: string[] = []

  await db.transaction(async (tx) => {
    for (const row of toInsert) {
      const memberId = matchMemberIdByName(row.memberNameRaw, roster)
      if (memberId === null) unmatched.push(row.memberNameRaw)
      await tx.insert(payments).values({
        memberId,
        memberNameRaw: row.memberNameRaw,
        paidAt: row.paidAt,
        amount: row.amount,
      })
    }
  })

  console.log(`Inserted ${toInsert.length} new payment(s).`)
  if (unmatched.length > 0) {
    const distinct = [...new Set(unmatched)]
    console.log(`${unmatched.length} of them (${distinct.length} distinct names) did not match a member:`)
    for (const name of distinct) console.log(`  - ${name}`)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
