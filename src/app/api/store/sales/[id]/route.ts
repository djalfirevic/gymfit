import { NextResponse } from 'next/server'
import { deleteSale } from '@/lib/db/queries/store'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteSale(Number(id))
  return NextResponse.json({ ok: true })
}
