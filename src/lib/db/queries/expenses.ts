import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { expenseCategories, expenses } from '@/lib/db/schema'

export type Expense = typeof expenses.$inferSelect

export async function listExpenses(filter?: { categoryId?: number }): Promise<Expense[]> {
  const query = db.select().from(expenses).orderBy(desc(expenses.expenseDate))
  if (filter?.categoryId !== undefined) {
    return query.where(eq(expenses.categoryId, filter.categoryId))
  }
  return query
}

export async function createExpense(input: {
  expenseDate: Date
  description: string
  amount: string
  categoryId: number
}): Promise<Expense> {
  const [row] = await db.insert(expenses).values(input).returning()
  return row
}

export async function updateExpense(
  id: number,
  input: Partial<{ expenseDate: Date; description: string; amount: string; categoryId: number }>,
): Promise<Expense | undefined> {
  const [row] = await db.update(expenses).set(input).where(eq(expenses.id, id)).returning()
  return row
}

export async function deleteExpense(id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id))
}

export async function monthlyExpensesByCategory(
  year: number,
): Promise<{ categoryId: number; slug: string | null; name: string; month: number; total: number }[]> {
  // Aliases are double-quoted deliberately: postgres.js does not camelCase raw
  // SQL results, so an unquoted "categoryId" would come back as categoryid.
  const rows = await db.execute(sql`
    select ${expenses.categoryId} as "categoryId",
           ${expenseCategories.slug} as "slug",
           ${expenseCategories.name} as "name",
           extract(month from ${expenses.expenseDate})::int as "month",
           sum(${expenses.amount})::numeric as "total"
    from ${expenses}
    join ${expenseCategories} on ${expenseCategories.id} = ${expenses.categoryId}
    where extract(year from ${expenses.expenseDate}) = ${year}
    group by "categoryId", "slug", "name", "month"
    order by "month"
  `)
  return (
    rows as unknown as { categoryId: number; slug: string | null; name: string; month: number; total: string }[]
  ).map((row) => ({ ...row, total: Number(row.total) }))
}
