// scripts/category-map.ts
// categorizeExpense returns a slug, but expenses now reference a category row
// by id. Import scripts resolve one to the other through this map.
import { db } from './db-client'
import { expenseCategories } from '../src/lib/db/schema'

export async function loadCategoryIdsBySlug(): Promise<Map<string, number>> {
  const rows = await db.select({ id: expenseCategories.id, slug: expenseCategories.slug }).from(expenseCategories)
  const map = new Map<string, number>()
  for (const row of rows) {
    if (row.slug) map.set(row.slug, row.id)
  }
  if (map.size === 0) {
    throw new Error('No seeded expense categories found — run pnpm db:migrate first.')
  }
  return map
}

export function requireCategoryId(map: Map<string, number>, slug: string): number {
  const id = map.get(slug)
  if (id === undefined) {
    throw new Error(`No expense category with slug "${slug}" — the seed migration may not have run.`)
  }
  return id
}
