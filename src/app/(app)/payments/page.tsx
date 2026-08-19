'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { errorMessage } from '@/lib/api-error'
import { formatRsd } from '@/lib/currency'

type Payment = { id: number; memberId: number | null; memberNameRaw: string; paidAt: string; amount: string }
type Member = { id: number; fullName: string }

async function fetchPayments(): Promise<Payment[]> {
  const response = await fetch('/api/payments')
  if (!response.ok) throw new Error('Failed to load payments')
  return response.json()
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members')
  if (!response.ok) throw new Error('Failed to load members')
  return response.json()
}

export default function PaymentsPage() {
  const queryClient = useQueryClient()
  const { data: payments, isLoading } = useQuery({ queryKey: ['payments'], queryFn: fetchPayments })
  const { data: members } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const [modalOpen, setModalOpen] = useState(false)
  const [memberNameRaw, setMemberNameRaw] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [amount, setAmount] = useState('')
  const [relinking, setRelinking] = useState<Payment | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => (payments ?? []).filter((payment) => payment.memberNameRaw.toLowerCase().includes(search.toLowerCase())),
    [payments, search],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberNameRaw, paidAt, amount }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(errorMessage(body, 'Greška pri čuvanju uplate'))
      return
    }
    setModalOpen(false)
    setMemberNameRaw('')
    setPaidAt('')
    setAmount('')
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  async function handleRelink(memberId: number) {
    if (!relinking) return
    const response = await fetch(`/api/payments/${relinking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(errorMessage(body, 'Greška pri povezivanju uplate'))
      return
    }
    setRelinking(null)
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Uplate</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nova uplata</Button>
      </div>

      <input
        placeholder="Pretraga po imenu člana..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
      />

      <Table<Payment>
        rows={filtered}
        columns={[
          { key: 'member', label: 'Član', render: (row) => row.memberNameRaw },
          {
            key: 'status',
            label: '',
            render: (row) =>
              row.memberId === null ? (
                <button className="text-xs font-medium text-yellow-400 underline" onClick={() => setRelinking(row)}>
                  Nije povezano — poveži
                </button>
              ) : null,
          },
          { key: 'date', label: 'Datum', render: (row) => new Date(row.paidAt).toLocaleDateString('sr-RS') },
          { key: 'amount', label: 'Iznos', render: (row) => formatRsd(Number(row.amount)) },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova uplata">
        <form onSubmit={handleSubmit}>
          <Field label="Ime člana" htmlFor="memberNameRaw">
            <input
              id="memberNameRaw"
              value={memberNameRaw}
              onChange={(event) => setMemberNameRaw(event.target.value)}
              list="member-names"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
            <datalist id="member-names">
              {(members ?? []).map((member) => (
                <option key={member.id} value={member.fullName} />
              ))}
            </datalist>
          </Field>
          <Field label="Datum" htmlFor="paidAt">
            <input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Iznos (RSD)" htmlFor="amount">
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>

      <Modal open={relinking !== null} onClose={() => setRelinking(null)} title="Poveži uplatu sa članom">
        <div className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
            <button
              key={member.id}
              onClick={() => handleRelink(member.id)}
              className="rounded-md border border-neutral-700 px-3 py-2 text-left text-white hover:bg-neutral-800"
            >
              {member.fullName}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
