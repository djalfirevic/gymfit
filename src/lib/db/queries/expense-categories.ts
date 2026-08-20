import 'server-only'
import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { expenseCategories } from '@/lib/db/schema'

export type ExpenseCategoryRow = typeof expenseCategories.$inferSelect

/** The fallback bucket, and the reason it cannot be deleted. */
export const FALLBACK_SLUG = 'ostalo'

export async function listExpenseCategories(): Promise<ExpenseCategoryRow[]> {
  return db.select().from(expenseCategories).orderBy(asc(expenseCategories.name))
}

/**
 * Two categories with the same name would split a total across bars that look
 * identical -- wrong in a way nobody would spot. Compared case-insensitively,
 * since "Marketing" and "marketing" are the same category to a human.
 */
export async function expenseCategoryNameTaken(name: string, exceptId?: number): Promise<boolean> {
  const sameName = sql`lower(${expenseCategories.name}) = lower(${name})`
  const [row] = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(exceptId === undefined ? sameName : and(sameName, ne(expenseCategories.id, exceptId)))
  return row !== undefined
}

export async function createExpenseCategory(input: { name: string }): Promise<ExpenseCategoryRow> {
  // Only the five originals carry a slug; anything added here is displayed by
  // name in every language, the same as product and member names.
  const [row] = await db.insert(expenseCategories).values({ name: input.name }).returning()
  return row
}

export async function renameExpenseCategory(id: number, name: string): Promise<ExpenseCategoryRow | undefined> {
  const [row] = await db.update(expenseCategories).set({ name }).where(eq(expenseCategories.id, id)).returning()
  return row
}

export async function findExpenseCategory(id: number): Promise<ExpenseCategoryRow | undefined> {
  const [row] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id))
  return row
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  await db.delete(expenseCategories).where(eq(expenseCategories.id, id))
}
