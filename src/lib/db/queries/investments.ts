import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { capitalInvestments } from '@/lib/db/schema'

export type CapitalInvestment = typeof capitalInvestments.$inferSelect

export async function listCapitalInvestments(): Promise<CapitalInvestment[]> {
  return db.select().from(capitalInvestments).orderBy(desc(capitalInvestments.investedAt))
}

export async function createCapitalInvestment(input: {
  investedAt: Date
  amountEur: string
  note?: string
}): Promise<CapitalInvestment> {
  const [row] = await db.insert(capitalInvestments).values(input).returning()
  return row
}

export async function deleteCapitalInvestment(id: number): Promise<void> {
  await db.delete(capitalInvestments).where(eq(capitalInvestments.id, id))
}

export async function totalInvestedEur(): Promise<number> {
  const [row] = (await db.execute(
    sql`select coalesce(sum(${capitalInvestments.amountEur}), 0)::numeric as total from ${capitalInvestments}`,
  )) as unknown as { total: string }[]
  return Number(row.total)
}
