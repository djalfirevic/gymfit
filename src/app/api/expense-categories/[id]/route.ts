import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  deleteExpenseCategory,
  expenseCategoryNameTaken,
  FALLBACK_SLUG,
  findExpenseCategory,
  renameExpenseCategory,
} from '@/lib/db/queries/expense-categories'

const updateSchema = z.object({ name: z.string().min(1).max(60) })

function isForeignKeyViolation(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === 'object' && 'code' in current && current.code === '23503') {
      return true
    }
    current = current instanceof Error ? current.cause : undefined
  }
  return false
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  if (await expenseCategoryNameTaken(body.data.name, Number(id))) {
    return NextResponse.json({ error: 'CATEGORY_DUPLICATE' }, { status: 409 })
  }
  const category = await renameExpenseCategory(Number(id), body.data.name)
  if (!category) {
    return NextResponse.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(category)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const category = await findExpenseCategory(Number(id))
  if (!category) {
    return NextResponse.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 404 })
  }
  // Ostalo is where anything uncategorised lands, so removing it would leave
  // the app with no fallback to offer.
  if (category.slug === FALLBACK_SLUG) {
    return NextResponse.json({ error: 'CATEGORY_IS_FALLBACK' }, { status: 409 })
  }

  try {
    await deleteExpenseCategory(Number(id))
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json({ error: 'CATEGORY_HAS_EXPENSES' }, { status: 409 })
    }
    throw error
  }
  return NextResponse.json({ ok: true })
}
