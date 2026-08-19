import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getExchangeRate, setExchangeRate } from '@/lib/db/queries/settings'

const updateSchema = z.object({ rsdToEurRate: z.number().positive() })

export async function GET() {
  return NextResponse.json({ rsdToEurRate: await getExchangeRate() })
}

export async function PATCH(request: Request) {
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  await setExchangeRate(body.data.rsdToEurRate)
  return NextResponse.json({ rsdToEurRate: body.data.rsdToEurRate })
}
