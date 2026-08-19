// scripts/seed-import.ts
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { eq } from 'drizzle-orm'
import { db } from './db-client'
import { expenses, members, payments, storeProducts, storeSales } from '../src/lib/db/schema'
import { categorizeExpense } from '../src/lib/expenses/categorize'
import { matchMemberIdByName } from '../src/lib/import/match-member'

function parseSerbianDate(raw: string): Date {
  const [day, month, year] = raw.trim().split('.').map(Number)
  if (!day || !month || !year) {
    throw new Error(`Cannot parse date: "${raw}"`)
  }
  const fullYear = year < 100 ? 2000 + year : year
  return new Date(Date.UTC(fullYear, month - 1, day))
}

function readCsv(path: string): Record<string, string>[] {
  const content = readFileSync(path, 'utf-8')
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
}

async function importMembers(dir: string): Promise<void> {
  const [existing] = await db.select().from(members).limit(1)
  if (existing) {
    console.log('Members: table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Members.csv'))
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const fullName = row['Ime i prezime']
      const renewalRaw = row['Obnova članarine']
      if (!fullName || !renewalRaw) continue
      await tx.insert(members).values({ fullName, membershipRenewalDate: parseSerbianDate(renewalRaw) })
    }
  })
  console.log(`Members: inserted ${rows.length} rows.`)
}

async function importPayments(dir: string): Promise<void> {
  const [existing] = await db.select().from(payments).limit(1)
  if (existing) {
    console.log('Payments: table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Payments.csv'))
  const roster = await db.select({ id: members.id, fullName: members.fullName }).from(members)
  const unmatched: string[] = []
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const memberNameRaw = row['Član']
      const dateRaw = row['Datum']
      const amountRaw = row['Cena']
      if (!memberNameRaw || !dateRaw || !amountRaw) continue
      const memberId = matchMemberIdByName(memberNameRaw, roster)
      if (memberId === null) unmatched.push(memberNameRaw)
      await tx.insert(payments).values({
        memberId,
        memberNameRaw,
        paidAt: parseSerbianDate(dateRaw),
        amount: amountRaw,
      })
    }
  })
  console.log(`Payments: inserted ${rows.length} rows.`)
  if (unmatched.length > 0) {
    const distinct = [...new Set(unmatched)]
    console.log(`Payments: ${unmatched.length} rows (${distinct.length} distinct names) did not match a member:`)
    for (const name of distinct) console.log(`  - ${name}`)
  }
}

async function importStore(dir: string): Promise<void> {
  const [existing] = await db.select().from(storeSales).limit(1)
  if (existing) {
    console.log('Store: sales table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Store.csv'))
  const productNames = [...new Set(rows.map((row) => row['Proizvod']).filter(Boolean))]
  const productIdByName = new Map<string, number>()
  for (const name of productNames) {
    const [existingProduct] = await db.select().from(storeProducts).where(eq(storeProducts.name, name))
    if (existingProduct) {
      productIdByName.set(name, existingProduct.id)
      continue
    }
    const firstPrice = rows.find((row) => row['Proizvod'] === name)?.['Cena'] ?? '0'
    const [created] = await db.insert(storeProducts).values({ name, defaultPrice: firstPrice }).returning()
    productIdByName.set(name, created.id)
  }
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const name = row['Proizvod']
      const dateRaw = row['Datum']
      const priceRaw = row['Cena']
      if (!name || !dateRaw || !priceRaw) continue
      const productId = productIdByName.get(name)
      if (!productId) continue
      await tx.insert(storeSales).values({ productId, soldAt: parseSerbianDate(dateRaw), price: priceRaw, quantity: 1 })
    }
  })
  console.log(`Store: seeded ${productNames.length} products, inserted ${rows.length} sales.`)
}

async function importExpenses(dir: string): Promise<void> {
  const [existing] = await db.select().from(expenses).limit(1)
  if (existing) {
    console.log('Expenses: table already has rows, skipping.')
    return
  }
  const rows = readCsv(resolve(dir, 'Expenses.csv'))
  const categoryCounts: Record<string, number> = {}
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const dateRaw = row['Datum']
      const description = row['Naziv']
      const amountRaw = row['Cena']
      if (!dateRaw || !description || !amountRaw) continue
      const category = categorizeExpense(description)
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1
      await tx.insert(expenses).values({ expenseDate: parseSerbianDate(dateRaw), description, amount: amountRaw, category })
    }
  })
  console.log(`Expenses: inserted ${rows.length} rows.`)
  console.log('Expenses by category:', categoryCounts)
}

async function main(): Promise<void> {
  const dirArgIndex = process.argv.indexOf('--dir')
  const dir = dirArgIndex >= 0 ? process.argv[dirArgIndex + 1] : './seed-data'
  console.log(`Importing from ${resolve(dir)}`)
  await importMembers(dir)
  await importPayments(dir)
  await importStore(dir)
  await importExpenses(dir)
  console.log('Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
