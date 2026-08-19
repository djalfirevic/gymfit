import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { members } from '@/lib/db/schema'

export type Member = typeof members.$inferSelect

export function memberStatus(renewalDate: Date, today: Date = new Date()): 'active' | 'not_renewed' {
  return renewalDate.getTime() >= today.getTime() ? 'active' : 'not_renewed'
}

export async function listMembers(): Promise<Member[]> {
  return db.select().from(members).orderBy(asc(members.fullName))
}

export async function getMember(id: number): Promise<Member | undefined> {
  const rows = await db.select().from(members).where(eq(members.id, id))
  return rows[0]
}

export async function createMember(input: { fullName: string; membershipRenewalDate: Date }): Promise<Member> {
  const [row] = await db.insert(members).values(input).returning()
  return row
}

export async function updateMember(
  id: number,
  input: Partial<{ fullName: string; membershipRenewalDate: Date }>,
): Promise<Member | undefined> {
  const [row] = await db.update(members).set(input).where(eq(members.id, id)).returning()
  return row
}

export async function deleteMember(id: number): Promise<void> {
  await db.delete(members).where(eq(members.id, id))
}

export async function countMembersByStatus(
  today: Date = new Date(),
): Promise<{ active: number; notRenewed: number; total: number }> {
  const all = await db.select({ membershipRenewalDate: members.membershipRenewalDate }).from(members)
  let active = 0
  for (const row of all) {
    if (memberStatus(new Date(row.membershipRenewalDate), today) === 'active') active++
  }
  return { active, notRenewed: all.length - active, total: all.length }
}
