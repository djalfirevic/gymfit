'use client'

import { useQueries } from '@tanstack/react-query'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import { StatCard } from '@/components/ui/StatCard'
import { formatRsd } from '@/lib/currency'
import type { ExpenseCategory } from '@/lib/expenses/categorize'

type DashboardResponse = {
  year: number
  memberCounts: { active: number; notRenewed: number; total: number }
  rollup: { month: number; zarada: number; troskovi: number; stanje: number; podela: number }[]
  yearlyTotals: { ukupnaZaradaEur: number; zaradaEur: number }
  expensesByCategory: { category: ExpenseCategory; month: number; total: number }[]
}

async function fetchDashboard(year: number): Promise<DashboardResponse> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  return response.json()
}

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear]

  const queries = useQueries({
    queries: years.map((year) => ({ queryKey: ['dashboard', year], queryFn: () => fetchDashboard(year) })),
  })
  const currentYearQuery = queries[queries.length - 1]

  if (queries.some((query) => query.isLoading)) {
    return <p className="text-neutral-400">Učitavanje...</p>
  }

  const yearOverYearData = queries
    .map((query, index) => (query.data ? { year: years[index], rollup: query.data.rollup } : null))
    .filter((entry): entry is { year: number; rollup: DashboardResponse['rollup'] } => entry !== null)

  const current = currentYearQuery.data

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Pregled</h1>

      {current && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Aktivni članovi" value={String(current.memberCounts.active)} />
          <StatCard label="Neobnovljeno" value={String(current.memberCounts.notRenewed)} />
          <StatCard
            label={`Zarada ovaj mesec (${current.year})`}
            value={formatRsd(current.rollup[new Date().getMonth()]?.zarada ?? 0)}
          />
          <StatCard
            label={`Troškovi ovaj mesec (${current.year})`}
            value={formatRsd(current.rollup[new Date().getMonth()]?.troskovi ?? 0)}
          />
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Zarada po mesecima po godinama</h2>
        <YearOverYearChart data={yearOverYearData} />
      </div>

      {current && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Troškovi po kategoriji ({current.year})</h2>
          <ExpensesByCategoryChart data={current.expensesByCategory} />
        </div>
      )}
    </div>
  )
}
