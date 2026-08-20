import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createExpenseCategory,
  expenseCategoryNameTaken,
  listExpenseCategories,
} from '@/lib/db/queries/expense-categories'

const createSchema = z.object({ name: z.string().min(1).max(60) })

export async function GET() {
  return NextResponse.json(await listExpenseCategories())
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  if (await expenseCategoryNameTaken(body.data.name)) {
    return NextResponse.json({ error: 'CATEGORY_DUPLICATE' }, { status: 409 })
  }
  return NextResponse.json(await createExpenseCategory(body.data), { status: 201 })
}
