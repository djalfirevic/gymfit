import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSale, listSales } from '@/lib/db/queries/store'

const createSchema = z.object({
  productId: z.number().int().positive(),
  soldAt: z.coerce.date(),
  price: z.string().min(1),
  quantity: z.number().int().positive().optional(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const productIdParam = url.searchParams.get('productId')
  const rows = await listSales(productIdParam ? { productId: Number(productIdParam) } : undefined)
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createSale(body.data), { status: 201 })
}
