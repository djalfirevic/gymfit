'use client'

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import { YearOverYearStackedChart } from '@/components/charts/YearOverYearStackedChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { useApiError } from '@/lib/use-api-error'
import { useFormat } from '@/lib/use-format'

type CapitalInvestment = { id: number; investedAt: string; amountEur: string; note: string | null }
type InvestmentsResponse = { entries: CapitalInvestment[]; totalInvestedEur: number }

type DashboardResponse = {
  rollup: { month: number; zarada: number; troskovi: number; stanje: number; podela: number }[]
  yearlyTotals: { ukupnaZaradaEur: number; zaradaEur: number }
}

async function fetchInvestments(): Promise<InvestmentsResponse> {
  const response = await fetch('/api/investments')
  if (!response.ok) throw new Error('Failed to load investments')
  return response.json()
}

async function fetchDashboard(year: number): Promise<DashboardResponse> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  return response.json()
}

async function fetchSettings(): Promise<{ rsdToEurRate: number }> {
  const response = await fetch('/api/settings')
  if (!response.ok) throw new Error('Failed to load settings')
  return response.json()
}

export default function InvestmentsPage() {
  const queryClient = useQueryClient()
  const t = useTranslations('investments')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const fmt = useFormat()
  const { data: investments, isLoading } = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments })
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, index) => 2024 + index)
  const yearlyQueries = useQueries({
    queries: years.map((year) => ({ queryKey: ['dashboard', year], queryFn: () => fetchDashboard(year) })),
  })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const rate = settings?.rsdToEurRate

  // Lifetime totals across every year of data, matching the source
  // spreadsheet's "Ukupna zarada"/"Zarada" (sums across all years), not just
  // the current one.
  const lifetimeTotals = yearlyQueries.reduce(
    (sum, query) => ({
      ukupnaZaradaEur: sum.ukupnaZaradaEur + (query.data?.yearlyTotals.ukupnaZaradaEur ?? 0),
      zaradaEur: sum.zaradaEur + (query.data?.yearlyTotals.zaradaEur ?? 0),
    }),
    { ukupnaZaradaEur: 0, zaradaEur: 0 },
  )
  const dashboardLoaded = yearlyQueries.every((query) => query.data)
  const yearOverYearData = yearlyQueries
    .map((query, index) => (query.data ? { year: years[index], rollup: query.data.rollup } : null))
    .filter((entry): entry is { year: number; rollup: DashboardResponse['rollup'] } => entry !== null)

  const [modalOpen, setModalOpen] = useState(false)
  const [investedAt, setInvestedAt] = useState('')
  const [amountEur, setAmountEur] = useState('')
  const [note, setNote] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investedAt, amountEur, note: note || undefined }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(apiError(body, t('saveError')))
      return
    }
    setModalOpen(false)
    setInvestedAt('')
    setAmountEur('')
    setNote('')
    queryClient.invalidateQueries({ queryKey: ['investments'] })
  }

  if (isLoading) return <p className="text-muted">{tc('loading')}</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>
        <Button onClick={() => setModalOpen(true)}>{t('new')}</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={t('invested')}
          value={fmt.eur(investments?.totalInvestedEur ?? 0)}
          hint={rate ? fmt.rsd((investments?.totalInvestedEur ?? 0) * rate) : undefined}
        />
        <StatCard
          label={t('totalEarnings')}
          value={dashboardLoaded ? fmt.eur(lifetimeTotals.ukupnaZaradaEur) : '—'}
          hint={dashboardLoaded && rate ? fmt.rsd(lifetimeTotals.ukupnaZaradaEur * rate) : undefined}
        />
        <StatCard
          label={t('myEarnings')}
          value={dashboardLoaded ? fmt.eur(lifetimeTotals.zaradaEur) : '—'}
          hint={dashboardLoaded && rate ? fmt.rsd(lifetimeTotals.zaradaEur * rate) : undefined}
        />
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">{t('earningsByMonthByYear')}</h2>
        <YearOverYearChart data={yearOverYearData} valueKey="zarada" />
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">{t('earningsByMonthByYear')}</h2>
        <YearOverYearStackedChart data={yearOverYearData} />
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">{t('balanceByMonthByYear')}</h2>
        <YearOverYearChart data={yearOverYearData} valueKey="stanje" />
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">{t('splitByMonthByYear')}</h2>
        <YearOverYearChart data={yearOverYearData} valueKey="podela" />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newTitle')}>
        <form onSubmit={handleSubmit}>
          <Field label={tc('date')} htmlFor="investedAt">
            <input
              id="investedAt"
              type="date"
              value={investedAt}
              onChange={(event) => setInvestedAt(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={tc('amountEur')} htmlFor="amountEur">
            <input
              id="amountEur"
              type="number"
              step="0.01"
              value={amountEur}
              onChange={(event) => setAmountEur(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={tc('note')} htmlFor="note">
            <input
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
            />
          </Field>
          <Button type="submit" className="w-full">
            {tc('save')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
