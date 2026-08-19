'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ExpensesByCategoryChart } from '@/components/charts/ExpensesByCategoryChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { formatRsd } from '@/lib/currency'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/expenses/categorize'

type Expense = { id: number; expenseDate: string; description: string; amount: string; category: ExpenseCategory }

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

  function openCreate() {
    setEditing(null)
    setExpenseDate('')
    setDescription('')
    setAmount('')
    setCategory('ostalo')
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { expenseDate, description, amount, category }
    const response = editing
      ? await fetch(`/api/expenses/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(body.error ?? 'Greška pri čuvanju troška')
      return
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', currentYear] })
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

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Troškovi</h1>
        <Button onClick={openCreate}>+ Novi trošak</Button>
      </div>

      {categoryData && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Troškovi po kategoriji ({currentYear})</h2>
          <ExpensesByCategoryChart data={categoryData} />
        </div>
      )}

      <Table<Expense>
        rows={expenses ?? []}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Izmena troška' : 'Novi trošak'}>
        <form onSubmit={handleSubmit}>
          <Field label="Datum" htmlFor="expenseDate">
            <input
              id="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Naziv" htmlFor="description">
            <input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
          <Field label="Kategorija" htmlFor="category">
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
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
    </div>
  )
}
