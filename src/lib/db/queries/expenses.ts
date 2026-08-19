import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { expenses } from '@/lib/db/schema'
import type { ExpenseCategory } from '@/lib/expenses/categorize'

export type Expense = typeof expenses.$inferSelect

export async function listExpenses(filter?: { category?: ExpenseCategory }): Promise<Expense[]> {
  const query = db.select().from(expenses).orderBy(desc(expenses.expenseDate))
  if (filter?.category) {
    return query.where(eq(expenses.category, filter.category))
  }
  return query
}

export async function createExpense(input: {
  expenseDate: Date
  description: string
  amount: string
  category: ExpenseCategory
}): Promise<Expense> {
  const [row] = await db.insert(expenses).values(input).returning()
  return row
}

export async function updateExpense(
  id: number,
  input: Partial<{ expenseDate: Date; description: string; amount: string; category: ExpenseCategory }>,
): Promise<Expense | undefined> {
  const [row] = await db.update(expenses).set(input).where(eq(expenses.id, id)).returning()
  return row
}

export async function deleteExpense(id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id))
}

export async function monthlyExpensesByCategory(
  year: number,
): Promise<{ category: ExpenseCategory; month: number; total: number }[]> {
  const rows = await db.execute(sql`
    select ${expenses.category} as category,
           extract(month from ${expenses.expenseDate})::int as month,
           sum(${expenses.amount})::numeric as total
    from ${expenses}
    where extract(year from ${expenses.expenseDate}) = ${year}
    group by category, month
    order by month
  `)
  return (rows as unknown as { category: ExpenseCategory; month: number; total: string }[]).map((row) => ({
    ...row,
    total: Number(row.total),
  }))
}
