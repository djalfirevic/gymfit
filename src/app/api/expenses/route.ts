import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createExpense, listExpenses } from '@/lib/db/queries/expenses'

const createSchema = z.object({
  expenseDate: z.coerce.date(),
  description: z.string().min(1),
  amount: z.string().min(1),
  categoryId: z.number().int().positive(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const categoryId = url.searchParams.get('categoryId')
  const rows = await listExpenses(categoryId ? { categoryId: Number(categoryId) } : undefined)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createExpense(body.data), { status: 201 })
}
