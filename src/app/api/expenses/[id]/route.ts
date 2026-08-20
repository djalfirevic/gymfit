import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteExpense, updateExpense } from '@/lib/db/queries/expenses'

const updateSchema = z.object({
  expenseDate: z.coerce.date().optional(),
  description: z.string().min(1).optional(),
  amount: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const expense = await updateExpense(Number(id), body.data)
  if (!expense) {
    return NextResponse.json({ error: 'EXPENSE_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(expense)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteExpense(Number(id))
  return NextResponse.json({ ok: true })
}
