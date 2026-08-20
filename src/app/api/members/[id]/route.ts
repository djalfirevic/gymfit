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
    return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(member)
}

function isForeignKeyViolation(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === 'object' && 'code' in current && current.code === '23503') {
      return true
    }
    current = current instanceof Error ? current.cause : undefined
  }
  return false
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await deleteMember(Number(id))
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        { error: 'MEMBER_HAS_PAYMENTS' },
        { status: 409 },
      )
    }
    throw error
  }
  return NextResponse.json({ ok: true })
}
