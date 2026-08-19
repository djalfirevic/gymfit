import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createProduct, listProducts } from '@/lib/db/queries/store'

const createSchema = z.object({ name: z.string().min(1), defaultPrice: z.string().min(1) })

export async function GET() {
  return NextResponse.json(await listProducts())
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createProduct(body.data), { status: 201 })
}
