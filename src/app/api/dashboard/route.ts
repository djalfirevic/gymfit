import { NextResponse } from 'next/server'
import { countMembersByStatus } from '@/lib/db/queries/members'
import { monthlyExpensesByCategory } from '@/lib/db/queries/expenses'
import { monthlyRollup, yearlyTotalsEur } from '@/lib/db/queries/dashboard'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear()
  const [memberCounts, rollup, yearlyTotals, expensesByCategory] = await Promise.all([
    countMembersByStatus(),
    monthlyRollup(year),
    yearlyTotalsEur(year),
    monthlyExpensesByCategory(year),
  ])
  return NextResponse.json({ year, memberCounts, rollup, yearlyTotals, expensesByCategory })
}
