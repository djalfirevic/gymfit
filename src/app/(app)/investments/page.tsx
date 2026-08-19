'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { formatEur, formatRsd } from '@/lib/currency'

type CapitalInvestment = { id: number; investedAt: string; amountEur: string; note: string | null }
type InvestmentsResponse = { entries: CapitalInvestment[]; totalInvestedEur: number }

async function fetchInvestments(): Promise<InvestmentsResponse> {
  const response = await fetch('/api/investments')
  if (!response.ok) throw new Error('Failed to load investments')
  return response.json()
}

async function fetchDashboard(year: number) {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  return response.json() as Promise<{ yearlyTotals: { ukupnaZaradaEur: number; zaradaEur: number } }>
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
  const { data: dashboard } = useQuery({ queryKey: ['dashboard', currentYear], queryFn: () => fetchDashboard(currentYear) })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const rate = settings?.rsdToEurRate

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
      alert(body.error ?? 'Greška pri čuvanju ulaganja')
      return
    }
    setModalOpen(false)
    setInvestedAt('')
    setAmountEur('')
    setNote('')
    queryClient.invalidateQueries({ queryKey: ['investments'] })
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati unos ulaganja?')) return
    const response = await fetch(`/api/investments/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      alert('Greška pri brisanju ulaganja')
      return
    }
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
          label={`Ukupna zarada (${currentYear})`}
          value={dashboard ? formatEur(dashboard.yearlyTotals.ukupnaZaradaEur) : '—'}
          hint={dashboard && rate ? formatRsd(dashboard.yearlyTotals.ukupnaZaradaEur * rate) : undefined}
        />
        <StatCard
          label={`Zarada (${currentYear})`}
          value={dashboard ? formatEur(dashboard.yearlyTotals.zaradaEur) : '—'}
          hint={dashboard && rate ? formatRsd(dashboard.yearlyTotals.zaradaEur * rate) : undefined}
        />
      </div>

      <Table<CapitalInvestment>
        rows={investments?.entries ?? []}
        columns={[
          { key: 'date', label: 'Datum', render: (row) => new Date(row.investedAt).toLocaleDateString('sr-RS') },
          { key: 'amount', label: 'Iznos (EUR)', render: (row) => formatEur(Number(row.amountEur)) },
          { key: 'note', label: 'Napomena', render: (row) => row.note ?? '' },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <Button variant="danger" onClick={() => handleDelete(row.id)}>
                Obriši
              </Button>
            ),
          },
        ]}
      />

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
