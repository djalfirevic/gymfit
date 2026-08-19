import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteMember, updateMember } from '@/lib/db/queries/members'

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  membershipRenewalDate: z.coerce.date().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const member = await updateMember(Number(id), body.data)
  if (!member) {
    return NextResponse.json({ error: 'Član nije pronađen' }, { status: 404 })
  }
  return NextResponse.json(member)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteMember(Number(id))
  return NextResponse.json({ ok: true })
}
