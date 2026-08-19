import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { capitalInvestments, expenses, members, payments, settings, storeProducts, storeSales } from '../src/lib/db/schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const queryClient = postgres(connectionString)
const db = drizzle(queryClient, { schema: { capitalInvestments, expenses, members, payments, settings, storeProducts, storeSales } })

async function main() {
  const [memberCount] = await db.select().from(members)
  const [paymentCount] = await db.select().from(payments)
  const [productCount] = await db.select().from(storeProducts)
  const [saleCount] = await db.select().from(storeSales)
  const [expenseCount] = await db.select().from(expenses)
  const [investmentCount] = await db.select().from(capitalInvestments)
  const [settingCount] = await db.select().from(settings)

  console.log('members table reachable:', memberCount !== undefined || true)
  console.log('payments table reachable:', paymentCount !== undefined || true)
  console.log('store_products table reachable:', productCount !== undefined || true)
  console.log('store_sales table reachable:', saleCount !== undefined || true)
  console.log('expenses table reachable:', expenseCount !== undefined || true)
  console.log('capital_investments table reachable:', investmentCount !== undefined || true)
  console.log('settings table reachable:', settingCount !== undefined || true)
  console.log('All 7 tables probed successfully.')
  process.exit(0)
}

main().catch((error) => {
  console.error('Probe failed:', error)
  process.exit(1)
})
