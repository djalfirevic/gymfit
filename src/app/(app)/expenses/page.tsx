'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Table } from '@/components/ui/Table'
import { errorMessage } from '@/lib/api-error'
import { formatRsd } from '@/lib/currency'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/expenses/categorize'
import { usePagination } from '@/lib/use-pagination'

type Expense = { id: number; expenseDate: string; description: string; amount: string; category: ExpenseCategory }
type ExpenseRow = { localId: number; expenseDate: string; description: string; amount: string; category: ExpenseCategory }

function emptyRow(localId: number): ExpenseRow {
  return { localId, expenseDate: '', description: '', amount: '', category: 'ostalo' }
}

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch('/api/expenses')
  if (!response.ok) throw new Error('Failed to load expenses')
  return response.json()
}

async function fetchDashboardExpenses(year: number): Promise<{ category: ExpenseCategory; month: number; total: number }[]> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  const body = await response.json()
  return body.expensesByCategory
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const { data: expenses, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })
  const currentYear = new Date().getFullYear()
  const { data: categoryData } = useQuery({
    queryKey: ['dashboard-expenses', currentYear],
    queryFn: () => fetchDashboardExpenses(currentYear),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('ostalo')
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
    setCategory(expense.category)
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
      body: JSON.stringify({ expenseDate, description, amount, category }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(errorMessage(body, 'Greška pri čuvanju troška'))
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
          category: row.category,
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
      alert(`${failed.length} od ${rows.length} troška nije sačuvano. Ostali su u formi — pokušajte ponovo.`)
      return
    }
    setModalOpen(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati trošak?')) return
    const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      alert('Greška pri brisanju troška')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', currentYear] })
  }

  if (isLoading) return <p className="text-muted">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">Troškovi</h1>
        <Button onClick={openCreate}>+ Novi trošak</Button>
      </div>

      {categoryData && (
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="mb-4 text-md font-semibold text-heading">Troškovi po kategoriji ({currentYear})</h2>
          <ExpensesByCategoryChart data={categoryData} />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <input
          placeholder="Pretraga po nazivu..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full max-w-sm rounded-card border border-line bg-surface px-3 py-2 text-fg"
        />
        <span className="whitespace-nowrap text-sm text-muted">
          Prikazano {filtered.length} od {expenses?.length ?? 0}
        </span>
      </div>

      <Table<Expense>
        rows={pageItems}
        columns={[
          { key: 'date', label: 'Datum', render: (row) => new Date(row.expenseDate).toLocaleDateString('sr-RS') },
          { key: 'description', label: 'Naziv', render: (row) => row.description },
          { key: 'category', label: 'Kategorija', render: (row) => EXPENSE_CATEGORY_LABELS[row.category] },
          { key: 'amount', label: 'Iznos', render: (row) => formatRsd(Number(row.amount)) },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Izmeni
                </Button>
                <Button variant="danger" onClick={() => handleDelete(row.id)}>
                  Obriši
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {editing ? (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Izmena troška">
          <form onSubmit={handleEditSubmit}>
            <Field label="Datum" htmlFor="expenseDate">
              <input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
            </Field>
            <Field label="Naziv" htmlFor="description">
              <input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
            </Field>
            <Field label="Iznos (RSD)" htmlFor="amount">
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
            </Field>
            <Field label="Kategorija" htmlFor="category">
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              >
                {EXPENSE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {EXPENSE_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" className="w-full">
              Sačuvaj
            </Button>
          </form>
        </Modal>
      ) : (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novi trošak" size="lg">
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
            <div className="hidden gap-2 px-1 text-xs text-muted sm:grid sm:grid-cols-[1fr_2fr_1fr_1.4fr_auto]">
              <span>Datum</span>
              <span>Naziv</span>
              <span>Iznos (RSD)</span>
              <span>Kategorija</span>
              <span />
            </div>
            {rows.map((row, index) => (
              <div key={row.localId} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_1fr_1.4fr_auto] sm:items-center">
                <input
                  type="date"
                  aria-label="Datum"
                  value={row.expenseDate}
                  onChange={(event) => updateRow(row.localId, { expenseDate: event.target.value })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                />
                <input
                  aria-label="Naziv"
                  value={row.description}
                  onChange={(event) => updateRow(row.localId, { description: event.target.value })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                />
                <input
                  type="number"
                  aria-label="Iznos (RSD)"
                  value={row.amount}
                  onChange={(event) => updateRow(row.localId, { amount: event.target.value })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                />
                <select
                  aria-label="Kategorija"
                  value={row.category}
                  onChange={(event) => updateRow(row.localId, { category: event.target.value as ExpenseCategory })}
                  className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                  required
                >
                  {EXPENSE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {EXPENSE_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
                {index === rows.length - 1 ? (
                  <Button type="button" onClick={addRow} aria-label="Dodaj red">
                    +
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeRow(row.localId)}
                    aria-label="Ukloni red"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button type="submit" className="mt-2 w-full" disabled={saving}>
              {saving ? 'Čuvanje...' : 'Sačuvaj'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
