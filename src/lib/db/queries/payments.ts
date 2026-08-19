import 'server-only'
import { desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { members, payments } from '@/lib/db/schema'
import { matchMemberIdByName } from '@/lib/import/match-member'

export type Payment = typeof payments.$inferSelect

export async function listPayments(filter?: { memberId?: number }): Promise<Payment[]> {
  const query = db.select().from(payments).orderBy(desc(payments.paidAt))
  if (filter?.memberId !== undefined) {
    return query.where(eq(payments.memberId, filter.memberId))
  }
  return query
}

export async function createPayment(input: {
  memberNameRaw: string
  paidAt: Date
  amount: string
}): Promise<Payment> {
  const roster = await db.select({ id: members.id, fullName: members.fullName }).from(members)
  const memberId = matchMemberIdByName(input.memberNameRaw, roster)
  const [row] = await db
    .insert(payments)
    .values({ ...input, memberId })
    .returning()
  return row
}

export async function relinkPayment(id: number, memberId: number): Promise<Payment | undefined> {
  const [row] = await db.update(payments).set({ memberId }).where(eq(payments.id, id)).returning()
  return row
}

export async function deletePayment(id: number): Promise<void> {
  await db.delete(payments).where(eq(payments.id, id))
}

export async function unmatchedPayments(): Promise<Payment[]> {
  return db.select().from(payments).where(isNull(payments.memberId)).orderBy(desc(payments.paidAt))
}
