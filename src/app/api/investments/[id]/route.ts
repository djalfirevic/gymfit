import { NextResponse } from 'next/server'
import { deleteCapitalInvestment } from '@/lib/db/queries/investments'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteCapitalInvestment(Number(id))
  return NextResponse.json({ ok: true })
}
