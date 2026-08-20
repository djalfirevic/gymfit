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
import { toDateKey } from '@/lib/dates'
import { useFormat } from '@/lib/use-format'
import { usePagination } from '@/lib/use-pagination'

type Member = { id: number; fullName: string; membershipRenewalDate: string }

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members')
  if (!response.ok) throw new Error('Failed to load members')
  return response.json()
}

export default function MembersPage() {
  const queryClient = useQueryClient()
  const t = useTranslations('members')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const fmt = useFormat()
  const { data, isLoading } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [fullName, setFullName] = useState('')
  const [renewalDate, setRenewalDate] = useState('')

  const filtered = useMemo(
    () => (data ?? []).filter((member) => member.fullName.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  )
  const { page, totalPages, pageItems, setPage } = usePagination(filtered)

  function openCreate() {
    setEditing(null)
    setFullName('')
    setRenewalDate('')
    setModalOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setFullName(member.fullName)
    setRenewalDate(member.membershipRenewalDate.slice(0, 10))
    setModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { fullName, membershipRenewalDate: renewalDate }
    const response = editing
      ? await fetch(`/api/members/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(apiError(body, t('saveError')))
      return
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  async function handleDelete(id: number) {
    if (!confirm(t('confirmDelete'))) return
    const response = await fetch(`/api/members/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      alert(t('deleteError'))
      return
    }
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  if (isLoading) return <p className="text-muted">{tc('loading')}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>
        <Button onClick={openCreate}>{t('new')}</Button>
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
          {tc('showing', { shown: filtered.length, total: data?.length ?? 0 })}
        </span>
      </div>

      <Table<Member>
        rows={pageItems}
        columns={[
          { key: 'fullName', label: t('fullName'), render: (row) => row.fullName },
          {
            key: 'renewal',
            label: t('renewal'),
            render: (row) => {
              const overdue = toDateKey(new Date(row.membershipRenewalDate)) < toDateKey(new Date())
              return (
                <span className={overdue ? 'font-medium text-danger' : 'text-fg'}>
                  {fmt.date(row.membershipRenewalDate)}
                </span>
              )
            },
          },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  {tc('edit')}
                </Button>
                <Button variant="danger" onClick={() => handleDelete(row.id)}>
                  {tc('delete')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('editTitle') : t('newTitle')}>
        <form onSubmit={handleSubmit}>
          <Field label={t('fullName')} htmlFor="fullName">
            <input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={t('renewal')} htmlFor="renewalDate">
            <input
              id="renewalDate"
              type="date"
              value={renewalDate}
              onChange={(event) => setRenewalDate(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
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
