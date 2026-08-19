import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPayment, listPayments } from '@/lib/db/queries/payments'

const createSchema = z.object({
  memberNameRaw: z.string().min(1),
  paidAt: z.coerce.date(),
  amount: z.string().min(1),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const memberIdParam = url.searchParams.get('memberId')
  const rows = await listPayments(memberIdParam ? { memberId: Number(memberIdParam) } : undefined)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const payment = await createPayment(body.data)
  return NextResponse.json(payment, { status: 201 })
}
