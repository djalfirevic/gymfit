'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Table } from '@/components/ui/Table'
import { useApiError } from '@/lib/use-api-error'
import { useFormat } from '@/lib/use-format'
import { useExpenseCategories } from '@/lib/use-expense-categories'
import { usePagination } from '@/lib/use-pagination'

type Expense = { id: number; expenseDate: string; description: string; amount: string; categoryId: number }
type ExpenseRow = { localId: number; expenseDate: string; description: string; amount: string; categoryId: number | '' }

function emptyRow(localId: number): ExpenseRow {
  return { localId, expenseDate: '', description: '', amount: '', categoryId: '' }
}

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch('/api/expenses')
  if (!response.ok) throw new Error('Failed to load expenses')
  return response.json()
}

async function fetchDashboardExpenses(
  year: number,
): Promise<{ categoryId: number; slug: string | null; name: string; month: number; total: number }[]> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  const body = await response.json()
  return body.expensesByCategory
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const t = useTranslations('expenses')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const fmt = useFormat()
  const { categories, labelById } = useExpenseCategories()
  const { data: expenses, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })
  const currentYear = new Date().getFullYear()
  const { data: categoryData } = useQuery({
    queryKey: ['dashboard-expenses', currentYear],
    queryFn: () => fetchDashboardExpenses(currentYear),
  })

  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ExpenseRow[]>([emptyRow(1)])
  const [nextRowId, setNextRowId] = useState(2)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(
    () => (expenses ?? []).filter((expense) => expense.description.toLowerCase().includes(search.toLowerCase())),
    [expenses, search],
  )
  const { page, totalPages, pageItems, setPage } = usePagination(filtered)

  function openCreate() {
    setEditing(null)
    setRows([emptyRow(1)])
    setNextRowId(2)
    setModalOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setExpenseDate(expense.expenseDate.slice(0, 10))
    setDescription(expense.description)
    setAmount(expense.amount)
    setCategoryId(expense.categoryId)
    setModalOpen(true)
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(nextRowId)])
    setNextRowId((id) => id + 1)
  }

  function removeRow(localId: number) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.localId !== localId) : current))
  }

  function updateRow(localId: number, patch: Partial<ExpenseRow>) {
    setRows((current) => current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)))
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!editing) return
    const response = await fetch(`/api/expenses/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseDate, description, amount, categoryId }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(apiError(body, t('saveError')))
      return
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', currentYear] })
  }

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const failed: ExpenseRow[] = []
    const usedYears = new Set<number>()
    for (const row of rows) {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseDate: row.expenseDate,
          description: row.description,
          amount: row.amount,
          categoryId: row.categoryId,
        }),
      })
      if (response.ok) {
        usedYears.add(new Date(row.expenseDate).getFullYear())
      } else {
        failed.push(row)
      }
    }

    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    for (const year of usedYears) {
      queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', year] })
    }

    setSaving(false)
    if (failed.length > 0) {
      setRows(failed)
      alert(t('partialSaveError', { failed: failed.length, total: rows.length }))
      return
    }
    setModalOpen(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    const response = await fetch(`/api/expenses/${deleting.id}`, { method: 'DELETE' })
    setDeletePending(false)
    if (!response.ok) {
      alert(t('deleteError'))
      return
    }
    setDeleting(null)
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', currentYear] })
  }

  if (isLoading) return <p className="text-muted">{tc('loading')}</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>
        <Button onClick={openCreate}>{t('new')}</Button>
      </div>

      {categoryData && (
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="mb-4 text-md font-semibold text-heading">{t('byCategory', { year: currentYear })}</h2>
          <ExpensesByCategoryChart data={categoryData} />
        </div>
      )}

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
          {tc('showing', { shown: filtered.length, total: expenses?.length ?? 0 })}
        </span>
      </div>

      <Table<Expense>
        rows={pageItems}
        columns={[
          { key: 'date', label: tc('date'), render: (row) => fmt.date(row.expenseDate) },
          { key: 'description', label: tc('name'), render: (row) => row.description },
          { key: 'category', label: tc('category'), render: (row) => labelById(row.categoryId) },
          { key: 'amount', label: tc('amount'), render: (row) => fmt.rsd(Number(row.amount)) },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  {tc('edit')}
                </Button>
                <Button variant="danger" onClick={() => setDeleting(row)}>
                  {tc('delete')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {editing ? (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('editTitle')}>
          <form onSubmit={handleEditSubmit}>
            <Field label={tc('date')} htmlFor="expenseDate">
              <input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
            </Field>
            <Field label={tc('name')} htmlFor="description">
              <input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
            <Field label={tc('category')} htmlFor="category">
              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(Number(event.target.value))}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              >
                <option value="" disabled>
                  {tc('category')}
                </option>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {labelById(option.id)}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" className="w-full">
              {tc('save')}
            </Button>
          </form>
        </Modal>
      ) : (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newTitle')} size="lg">
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
            <div className="hidden gap-2 px-1 text-xs text-muted sm:grid sm:grid-cols-[1fr_2fr_1fr_1.4fr_auto]">
              <span>{tc('date')}</span>
              <span>{tc('name')}</span>
              <span>{tc('amountRsd')}</span>
              <span>{tc('category')}</span>
              <span />
            </div>
            {rows.map((row, index) => (
              <div key={row.localId} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_1fr_1.4fr_auto] sm:items-center">
                <input
                  type="date"
                  aria-label={tc('date')}
                  value={row.expenseDate}
                  onChange={(event) => updateRow(row.localId, { expenseDate: event.target.value })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                />
                <input
                  aria-label={tc('name')}
                  value={row.description}
                  onChange={(event) => updateRow(row.localId, { description: event.target.value })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                />
                <input
                  type="number"
                  aria-label={tc('amountRsd')}
                  value={row.amount}
                  onChange={(event) => updateRow(row.localId, { amount: event.target.value })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                />
                <select
                  aria-label={tc('category')}
                  value={row.categoryId}
                  onChange={(event) => updateRow(row.localId, { categoryId: Number(event.target.value) })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                >
                  <option value="" disabled>
                  {tc('category')}
                </option>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {labelById(option.id)}
                  </option>
                ))}
                </select>
                {index === rows.length - 1 ? (
                  <Button type="button" onClick={addRow} aria-label={t('addRow')}>
                    +
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeRow(row.localId)}
                    aria-label={t('removeRow')}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button type="submit" className="mt-2 w-full" disabled={saving}>
              {saving ? tc('saving') : tc('save')}
            </Button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={deleting !== null}
        message={t('confirmDelete', { name: deleting?.description ?? '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        pending={deletePending}
      />
    </div>
  )
}
