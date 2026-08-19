import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createCapitalInvestment, listCapitalInvestments, totalInvestedEur } from '@/lib/db/queries/investments'

const createSchema = z.object({
  investedAt: z.coerce.date(),
  amountEur: z.string().min(1),
  note: z.string().optional(),
})

export async function GET() {
  const [entries, total] = await Promise.all([listCapitalInvestments(), totalInvestedEur()])
  return NextResponse.json({ entries, totalInvestedEur: total })
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createCapitalInvestment(body.data), { status: 201 })
}
