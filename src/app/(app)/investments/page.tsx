'use client'

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import { YearOverYearStackedChart } from '@/components/charts/YearOverYearStackedChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { errorMessage } from '@/lib/api-error'
import { formatEur, formatRsd } from '@/lib/currency'

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
      alert(errorMessage(body, 'Greška pri čuvanju ulaganja'))
      return
    }
    setModalOpen(false)
    setInvestedAt('')
    setAmountEur('')
    setNote('')
    queryClient.invalidateQueries({ queryKey: ['investments'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Investicije</h1>
        <Button onClick={() => setModalOpen(true)}>+ Novo ulaganje</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Uloženo"
          value={formatEur(investments?.totalInvestedEur ?? 0)}
          hint={rate ? formatRsd((investments?.totalInvestedEur ?? 0) * rate) : undefined}
        />
        <StatCard
          label="Ukupna zarada"
          value={dashboardLoaded ? formatEur(lifetimeTotals.ukupnaZaradaEur) : '—'}
          hint={dashboardLoaded && rate ? formatRsd(lifetimeTotals.ukupnaZaradaEur * rate) : undefined}
        />
        <StatCard
          label="Moja zarada"
          value={dashboardLoaded ? formatEur(lifetimeTotals.zaradaEur) : '—'}
          hint={dashboardLoaded && rate ? formatRsd(lifetimeTotals.zaradaEur * rate) : undefined}
        />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Zarada po mesecima po godinama</h2>
        <YearOverYearChart data={yearOverYearData} valueKey="zarada" />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Zarada po mesecima po godinama</h2>
        <YearOverYearStackedChart data={yearOverYearData} />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Stanje po mesecima po godinama (posle troškova)</h2>
        <YearOverYearChart data={yearOverYearData} valueKey="stanje" />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Podela po mesecima po godinama (Stanje / 2)</h2>
        <YearOverYearChart data={yearOverYearData} valueKey="podela" />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo ulaganje">
        <form onSubmit={handleSubmit}>
          <Field label="Datum" htmlFor="investedAt">
            <input
              id="investedAt"
              type="date"
              value={investedAt}
              onChange={(event) => setInvestedAt(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Iznos (EUR)" htmlFor="amountEur">
            <input
              id="amountEur"
              type="number"
              step="0.01"
              value={amountEur}
              onChange={(event) => setAmountEur(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Napomena" htmlFor="note">
            <input
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
