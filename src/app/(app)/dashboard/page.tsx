'use client'

import { useQueries } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import { StatCard } from '@/components/ui/StatCard'
import { useFormat } from '@/lib/use-format'
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
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')
  const fmt = useFormat()
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear]

  const queries = useQueries({
    queries: years.map((year) => ({ queryKey: ['dashboard', year], queryFn: () => fetchDashboard(year) })),
  })
  const currentYearQuery = queries[queries.length - 1]

  if (queries.some((query) => query.isLoading)) {
    return <p className="text-muted">{tc('loading')}</p>
  }

  const yearOverYearData = queries
    .map((query, index) => (query.data ? { year: years[index], rollup: query.data.rollup } : null))
    .filter((entry): entry is { year: number; rollup: DashboardResponse['rollup'] } => entry !== null)

  const current = currentYearQuery.data

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>

      {current && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label={t('activeMembers')} value={String(current.memberCounts.active)} />
          <StatCard label={t('notRenewed')} value={String(current.memberCounts.notRenewed)} />
          <StatCard
            label={t('earningsThisMonth', { year: current.year })}
            value={fmt.rsd(current.rollup[new Date().getMonth()]?.zarada ?? 0)}
          />
          <StatCard
            label={t('expensesThisMonth', { year: current.year })}
            value={fmt.rsd(current.rollup[new Date().getMonth()]?.troskovi ?? 0)}
          />
        </div>
      )}

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">{t('earningsByMonthByYear')}</h2>
        <YearOverYearChart data={yearOverYearData} />
      </div>

      {current && (
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="mb-4 text-md font-semibold text-heading">{t('expensesByCategory', { year: current.year })}</h2>
          <ExpensesByCategoryChart data={current.expensesByCategory} />
        </div>
      )}
    </div>
  )
}
