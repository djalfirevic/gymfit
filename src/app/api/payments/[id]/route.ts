import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deletePayment, relinkPayment } from '@/lib/db/queries/payments'

const relinkSchema = z.object({ memberId: z.number().int().positive() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = relinkSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const payment = await relinkPayment(Number(id), body.data.memberId)
  if (!payment) {
    return NextResponse.json({ error: 'PAYMENT_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(payment)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deletePayment(Number(id))
  return NextResponse.json({ ok: true })
}
