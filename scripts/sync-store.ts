// scripts/sync-store.ts
// Same reasoning as sync-payments.ts: a product can legitimately sell more
// than once on the same day at the same price, so this groups both the CSV
// and the database by (product, date, price) and inserts however many more
// the CSV has than the database already does, per group. New products (by
// name) are created the same way seed-import.ts does, using the first price
// seen for that product as its default price.
import './load-env'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { db } from './db-client'
import { storeProducts, storeSales } from '../src/lib/db/schema'

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

function saleKey(productName: string, soldAt: Date, price: string): string {
  return `${productName}|${toDateKey(soldAt)}|${Number(price)}`
}

async function main(): Promise<void> {
  const csvPathArgIndex = process.argv.indexOf('--file')
  const csvPath = csvPathArgIndex >= 0 ? process.argv[csvPathArgIndex + 1] : undefined
  if (!csvPath) {
    console.error('Usage: pnpm sync:store -- --file "/path/to/Store.csv"')
    process.exit(1)
  }

  const content = readFileSync(resolve(csvPath), 'utf-8')
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]

  type ParsedRow = { productName: string; soldAt: Date; price: string }
  const csvRows: ParsedRow[] = []
  for (const row of rows) {
    const productName = row['Proizvod']
    const dateRaw = row['Datum']
    const priceRaw = row['Cena']
    if (!productName || !dateRaw || !priceRaw) continue
    csvRows.push({ productName, soldAt: parseSerbianDate(dateRaw), price: priceRaw })
  }

  const csvGroups = new Map<string, ParsedRow[]>()
  for (const row of csvRows) {
    const key = saleKey(row.productName, row.soldAt, row.price)
    const group = csvGroups.get(key)
    if (group) group.push(row)
    else csvGroups.set(key, [row])
  }

  const existingProducts = await db.select().from(storeProducts)
  const productIdByName = new Map(existingProducts.map((product) => [product.name, product.id]))
  const productNameById = new Map(existingProducts.map((product) => [product.id, product.name]))

  const existingSales = await db
    .select({ productId: storeSales.productId, soldAt: storeSales.soldAt, price: storeSales.price })
    .from(storeSales)
  const dbCounts = new Map<string, number>()
  for (const row of existingSales) {
    const productName = productNameById.get(row.productId)
    if (!productName) continue
    const key = saleKey(productName, new Date(row.soldAt), row.price)
    dbCounts.set(key, (dbCounts.get(key) ?? 0) + 1)
  }

  const toInsert: ParsedRow[] = []
  for (const [key, group] of csvGroups) {
    const already = dbCounts.get(key) ?? 0
    const missing = group.length - already
    if (missing > 0) toInsert.push(...group.slice(already, group.length))
  }

  if (toInsert.length === 0) {
    console.log('No new sales found — database already matches the CSV.')
    process.exit(0)
  }

  console.log(`Found ${toInsert.length} new sale(s) out of ${csvRows.length} valid CSV rows.`)

  const newProductNames = [...new Set(toInsert.map((row) => row.productName))].filter(
    (name) => !productIdByName.has(name),
  )
  for (const name of newProductNames) {
    const firstPrice = toInsert.find((row) => row.productName === name)?.price ?? '0'
    const [created] = await db.insert(storeProducts).values({ name, defaultPrice: firstPrice }).returning()
    productIdByName.set(name, created.id)
    console.log(`New product created: ${name} (default price ${firstPrice})`)
  }

  await db.transaction(async (tx) => {
    for (const row of toInsert) {
      const productId = productIdByName.get(row.productName)
      if (!productId) continue
      await tx.insert(storeSales).values({ productId, soldAt: row.soldAt, price: row.price, quantity: 1 })
    }
  })

  console.log(`Inserted ${toInsert.length} new sale(s).`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
