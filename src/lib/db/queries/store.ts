import 'server-only'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { storeProducts, storeSales } from '@/lib/db/schema'

export type StoreProduct = typeof storeProducts.$inferSelect
export type StoreSale = typeof storeSales.$inferSelect

export async function listProducts(): Promise<StoreProduct[]> {
  return db.select().from(storeProducts).orderBy(asc(storeProducts.name))
}

export async function createProduct(input: { name: string; defaultPrice: string }): Promise<StoreProduct> {
  const [row] = await db.insert(storeProducts).values(input).returning()
  return row
}

export async function updateProduct(
  id: number,
  input: Partial<{ name: string; defaultPrice: string; active: boolean }>,
): Promise<StoreProduct | undefined> {
  const [row] = await db.update(storeProducts).set(input).where(eq(storeProducts.id, id)).returning()
  return row
}

export async function listSales(filter?: { productId?: number }): Promise<StoreSale[]> {
  const query = db.select().from(storeSales).orderBy(desc(storeSales.soldAt))
  if (filter?.productId !== undefined) {
    return query.where(eq(storeSales.productId, filter.productId))
  }
  return query
}

export async function createSale(input: {
  productId: number
  soldAt: Date
  price: string
  quantity?: number
}): Promise<StoreSale> {
  const [row] = await db
    .insert(storeSales)
    .values({ quantity: 1, ...input })
    .returning()
  return row
}

export async function deleteSale(id: number): Promise<void> {
  await db.delete(storeSales).where(eq(storeSales.id, id))
}

export async function monthlyProductCounts(
  year: number,
): Promise<{ productName: string; month: number; count: number }[]> {
  const rows = await db.execute(sql`
    select ${storeProducts.name} as "productName",
           extract(month from ${storeSales.soldAt})::int as month,
           sum(${storeSales.quantity})::int as count
    from ${storeSales}
    join ${storeProducts} on ${storeProducts.id} = ${storeSales.productId}
    where extract(year from ${storeSales.soldAt}) = ${year}
    group by "productName", month
    order by month
  `)
  return rows as unknown as { productName: string; month: number; count: number }[]
}
