import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createMember, listMembers } from '@/lib/db/queries/members'

const createSchema = z.object({
  fullName: z.string().min(1),
  membershipRenewalDate: z.coerce.date(),
})

export async function GET() {
  const rows = await listMembers()
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const member = await createMember(body.data)
  return NextResponse.json(member, { status: 201 })
}
