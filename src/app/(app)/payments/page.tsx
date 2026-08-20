'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Table } from '@/components/ui/Table'
import { useApiError } from '@/lib/use-api-error'
import { useFormat } from '@/lib/use-format'
import { usePagination } from '@/lib/use-pagination'

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
  const t = useTranslations('payments')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const fmt = useFormat()
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
  const { page, totalPages, pageItems, setPage } = usePagination(filtered)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberNameRaw, paidAt, amount }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(apiError(body, t('saveError')))
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
      alert(apiError(body, t('relinkError')))
      return
    }
    setRelinking(null)
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  if (isLoading) return <p className="text-muted">{tc('loading')}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>
        <Button onClick={() => setModalOpen(true)}>{t('new')}</Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full max-w-sm rounded-card border border-line bg-surface px-3 py-2 text-fg"
        />
        <span className="whitespace-nowrap text-sm text-muted">
          {tc('showing', { shown: filtered.length, total: payments?.length ?? 0 })}
        </span>
      </div>

      <Table<Payment>
        rows={pageItems}
        columns={[
          { key: 'member', label: t('member'), render: (row) => row.memberNameRaw },
          {
            key: 'status',
            label: '',
            render: (row) =>
              row.memberId === null ? (
                <button className="text-xs font-medium text-warning underline" onClick={() => setRelinking(row)}>
                  {t('unlinked')}
                </button>
              ) : null,
          },
          { key: 'date', label: tc('date'), render: (row) => fmt.date(row.paidAt) },
          { key: 'amount', label: tc('amount'), render: (row) => fmt.rsd(Number(row.amount)) },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newTitle')}>
        <form onSubmit={handleSubmit}>
          <Field label={t('memberName')} htmlFor="memberNameRaw">
            <input
              id="memberNameRaw"
              value={memberNameRaw}
              onChange={(event) => setMemberNameRaw(event.target.value)}
              list="member-names"
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
            <datalist id="member-names">
              {(members ?? []).map((member) => (
                <option key={member.id} value={member.fullName} />
              ))}
            </datalist>
          </Field>
          <Field label={tc('date')} htmlFor="paidAt">
            <input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={tc('amountRsd')} htmlFor="amount">
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            {tc('save')}
          </Button>
        </form>
      </Modal>

      <Modal open={relinking !== null} onClose={() => setRelinking(null)} title={t('relinkTitle')}>
        <div className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
            <button
              key={member.id}
              onClick={() => handleRelink(member.id)}
              className="rounded-card border border-line px-3 py-2 text-left text-fg hover:bg-surface-2"
            >
              {member.fullName}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
