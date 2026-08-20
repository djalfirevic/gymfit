import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateProduct } from '@/lib/db/queries/store'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  defaultPrice: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const product = await updateProduct(Number(id), body.data)
  if (!product) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(product)
}
