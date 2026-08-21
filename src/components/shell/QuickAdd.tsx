'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { normalizeName } from '@/lib/import/match-member'
import { useApiError } from '@/lib/use-api-error'
import { useExpenseCategories } from '@/lib/use-expense-categories'

type Member = { id: number; fullName: string }
type Product = { id: number; name: string; defaultPrice: string }

type PaymentRow = { localId: number; memberName: string; createdMemberId: number | null; amount: string; until: string }
type SaleRow = { localId: number; productId: number | ''; price: string; quantity: string }
type ExpenseRow = { localId: number; description: string; amount: string; categoryId: number | '' }

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members')
  if (!response.ok) throw new Error('Failed to load members')
  return response.json()
}

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/store/products')
  if (!response.ok) throw new Error('Failed to load products')
  return response.json()
}

const INPUT = 'rounded-card border border-line bg-surface px-3 py-2 text-fg'

const emptyPayment = (localId: number): PaymentRow => ({
  localId,
  memberName: '',
  createdMemberId: null,
  amount: '',
  until: '',
})
const emptySale = (localId: number): SaleRow => ({ localId, productId: '', price: '', quantity: '1' })
const emptyExpense = (localId: number): ExpenseRow => ({ localId, description: '', amount: '', categoryId: '' })

// Declared at module scope: a component created inside another component gets a
// fresh identity on every render, which remounts its subtree and loses focus
// mid-typing.
function Heading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-line pb-1.5">
      <h3 className="text-md font-semibold text-heading">{label}</h3>
      {count > 0 && <span className="tabular text-sm text-muted">{count}</span>}
    </div>
  )
}

function RowButton({ isLast, onAdd, onRemove }: { isLast: boolean; onAdd: () => void; onRemove: () => void }) {
  const tc = useTranslations('common')
  return isLast ? (
    <Button type="button" aria-label={tc('addRow')} onClick={onAdd}>
      +
    </Button>
  ) : (
    <Button type="button" variant="secondary" aria-label={tc('removeRow')} onClick={onRemove}>
      ✕
    </Button>
  )
}

export function QuickAdd() {
  const queryClient = useQueryClient()
  const t = useTranslations('quickAdd')
  const tc = useTranslations('common')
  const tnav = useTranslations('nav')
  const tstore = useTranslations('store')
  const apiError = useApiError()
  const { categories, labelById } = useExpenseCategories()

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [nextId, setNextId] = useState(4)
  const [creatingMemberFor, setCreatingMemberFor] = useState<number | null>(null)

  const [payments, setPayments] = useState<PaymentRow[]>([emptyPayment(1)])
  const [sales, setSales] = useState<SaleRow[]>([emptySale(2)])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([emptyExpense(3)])

  const { data: memberData } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const { data: productData } = useQuery({ queryKey: ['store-products'], queryFn: fetchProducts })
  const members = memberData ?? []
  const products = productData ?? []

  function takeId(): number {
    const id = nextId
    setNextId((value) => value + 1)
    return id
  }

  function closeAndReset() {
    setOpen(false)
    setDate(todayIso())
    setPayments([emptyPayment(1)])
    setSales([emptySale(2)])
    setExpenses([emptyExpense(3)])
    setNextId(4)
  }

  function matchMember(row: PaymentRow): number | null {
    if (row.createdMemberId !== null) return row.createdMemberId
    const found = members.find((member) => normalizeName(member.fullName) === normalizeName(row.memberName))
    return found?.id ?? null
  }

  // Blank rows are skipped on save, so a section you did not use never has to
  // be emptied first -- open the form once and fill in whatever happened today.
  const filledPayments = payments.filter((row) => matchMember(row) !== null && row.amount && row.until)
  const filledSales = sales.filter((row) => row.productId !== '' && row.price)
  const filledExpenses = expenses.filter((row) => row.description.trim() && row.amount && row.categoryId !== '')
  const totalToSave = filledPayments.length + filledSales.length + filledExpenses.length

  async function handleCreateMember(row: PaymentRow) {
    setCreatingMemberFor(row.localId)
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: row.memberName.trim(), membershipRenewalDate: row.until || date }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        alert(apiError(body, t('memberSaveError')))
        return
      }
      setPayments((current) =>
        current.map((entry) => (entry.localId === row.localId ? { ...entry, createdMemberId: body.id } : entry)),
      )
      queryClient.invalidateQueries({ queryKey: ['members'] })
    } finally {
      setCreatingMemberFor(null)
    }
  }

  async function handleSaveAll() {
    setSaving(true)
    const failedPayments: PaymentRow[] = []
    const failedSales: SaleRow[] = []
    const failedExpenses: ExpenseRow[] = []

    for (const row of filledPayments) {
      const memberId = matchMember(row)
      const paid = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNameRaw: row.memberName.trim(), paidAt: date, amount: row.amount }),
      })
      const renewed = paid.ok
        ? await fetch(`/api/members/${memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ membershipRenewalDate: row.until }),
          })
        : null
      if (!paid.ok || !renewed?.ok) failedPayments.push(row)
    }

    for (const row of filledSales) {
      const response = await fetch('/api/store/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(row.productId),
          soldAt: date,
          price: row.price,
          quantity: Number(row.quantity) || 1,
        }),
      })
      if (!response.ok) failedSales.push(row)
    }

    for (const row of filledExpenses) {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseDate: date,
          description: row.description,
          amount: row.amount,
          categoryId: row.categoryId,
        }),
      })
      if (!response.ok) failedExpenses.push(row)
    }

    const year = new Date(date).getFullYear()
    const keys = [['members'], ['payments'], ['store-sales'], ['expenses'], ['dashboard', year], ['dashboard-expenses', year]]
    for (const key of keys) queryClient.invalidateQueries({ queryKey: key })

    setSaving(false)
    const failed = failedPayments.length + failedSales.length + failedExpenses.length
    if (failed > 0) {
      // Keep only what failed, so retrying cannot save the successful rows twice.
      setPayments(failedPayments.length > 0 ? failedPayments : [emptyPayment(takeId())])
      setSales(failedSales.length > 0 ? failedSales : [emptySale(takeId())])
      setExpenses(failedExpenses.length > 0 ? failedExpenses : [emptyExpense(takeId())])
      alert(t('partialSaveError', { failed, total: totalToSave }))
      return
    }
    closeAndReset()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        {tnav('newEntry')}
      </Button>

      <Modal open={open} onClose={closeAndReset} title={t('title')} size="lg">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="qa-date" className="text-sm font-medium text-muted">
              {tc('date')}
            </label>
            <input
              id="qa-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={INPUT}
            />
            <span className="text-sm text-muted">{t('dateAppliesToAll')}</span>
          </div>

          <section className="flex flex-col gap-2">
            <Heading label={t('sectionPayments')} count={filledPayments.length} />
            {payments.map((row, index) => {
              const showAddMember = row.memberName.trim().length > 0 && matchMember(row) === null
              return (
                <div key={row.localId} className="flex flex-col gap-1">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center">
                    <input
                      aria-label={t('memberNameLabel')}
                      placeholder={t('memberNameLabel')}
                      list="qa-members"
                      value={row.memberName}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((entry) =>
                            entry.localId === row.localId
                              ? { ...entry, memberName: event.target.value, createdMemberId: null }
                              : entry,
                          ),
                        )
                      }
                      className={INPUT}
                    />
                    <input
                      type="number"
                      aria-label={tc('amountRsd')}
                      placeholder={tc('amountRsd')}
                      value={row.amount}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((entry) =>
                            entry.localId === row.localId ? { ...entry, amount: event.target.value } : entry,
                          ),
                        )
                      }
                      className={INPUT}
                    />
                    <input
                      type="date"
                      aria-label={t('validUntil')}
                      value={row.until}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((entry) =>
                            entry.localId === row.localId ? { ...entry, until: event.target.value } : entry,
                          ),
                        )
                      }
                      className={INPUT}
                    />
                    <RowButton
                      isLast={index === payments.length - 1}
                      onAdd={() => setPayments((current) => [...current, emptyPayment(takeId())])}
                      onRemove={() => setPayments((current) => current.filter((entry) => entry.localId !== row.localId))}
                    />
                  </div>
                  {showAddMember && (
                    <div className="flex items-center gap-2 rounded-card bg-surface-2 px-3 py-1.5 text-sm text-warning">
                      <span>{t('newMemberPrompt')}</span>
                      <Button
                        type="button"
                        onClick={() => handleCreateMember(row)}
                        disabled={creatingMemberFor === row.localId}
                      >
                        {creatingMemberFor === row.localId ? '...' : t('addMember')}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
            <datalist id="qa-members">
              {members.map((member) => (
                <option key={member.id} value={member.fullName} />
              ))}
            </datalist>
          </section>

          <section className="flex flex-col gap-2">
            <Heading label={t('sectionSales')} count={filledSales.length} />
            {sales.map((row, index) => (
              <div key={row.localId} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center">
                <select
                  aria-label={tstore('product')}
                  value={row.productId}
                  onChange={(event) => {
                    const productId = Number(event.target.value)
                    const product = products.find((item) => item.id === productId)
                    setSales((current) =>
                      current.map((entry) =>
                        entry.localId === row.localId
                          ? {
                              ...entry,
                              productId,
                              price: entry.price || (product ? String(Number(product.defaultPrice)) : ''),
                            }
                          : entry,
                      ),
                    )
                  }}
                  className={INPUT}
                >
                  <option value="" disabled>
                    {t('chooseProduct')}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  aria-label={tc('priceRsd')}
                  placeholder={tc('priceRsd')}
                  value={row.price}
                  onChange={(event) =>
                    setSales((current) =>
                      current.map((entry) =>
                        entry.localId === row.localId ? { ...entry, price: event.target.value } : entry,
                      ),
                    )
                  }
                  className={INPUT}
                />
                <input
                  type="number"
                  min="1"
                  aria-label={tc('quantity')}
                  value={row.quantity}
                  onChange={(event) =>
                    setSales((current) =>
                      current.map((entry) =>
                        entry.localId === row.localId ? { ...entry, quantity: event.target.value } : entry,
                      ),
                    )
                  }
                  className={INPUT}
                />
                <RowButton
                  isLast={index === sales.length - 1}
                  onAdd={() => setSales((current) => [...current, emptySale(takeId())])}
                  onRemove={() => setSales((current) => current.filter((entry) => entry.localId !== row.localId))}
                />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <Heading label={t('sectionExpenses')} count={filledExpenses.length} />
            {expenses.map((row, index) => (
              <div key={row.localId} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1.2fr_auto] sm:items-center">
                <input
                  aria-label={tc('name')}
                  placeholder={tc('name')}
                  value={row.description}
                  onChange={(event) =>
                    setExpenses((current) =>
                      current.map((entry) =>
                        entry.localId === row.localId ? { ...entry, description: event.target.value } : entry,
                      ),
                    )
                  }
                  className={INPUT}
                />
                <input
                  type="number"
                  aria-label={tc('amountRsd')}
                  placeholder={tc('amountRsd')}
                  value={row.amount}
                  onChange={(event) =>
                    setExpenses((current) =>
                      current.map((entry) =>
                        entry.localId === row.localId ? { ...entry, amount: event.target.value } : entry,
                      ),
                    )
                  }
                  className={INPUT}
                />
                <select
                  aria-label={tc('category')}
                  value={row.categoryId}
                  onChange={(event) =>
                    setExpenses((current) =>
                      current.map((entry) =>
                        entry.localId === row.localId ? { ...entry, categoryId: Number(event.target.value) } : entry,
                      ),
                    )
                  }
                  className={INPUT}
                >
                  <option value="" disabled>
                    {tc('category')}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {labelById(category.id)}
                    </option>
                  ))}
                </select>
                <RowButton
                  isLast={index === expenses.length - 1}
                  onAdd={() => setExpenses((current) => [...current, emptyExpense(takeId())])}
                  onRemove={() => setExpenses((current) => current.filter((entry) => entry.localId !== row.localId))}
                />
              </div>
            ))}
          </section>

          <Button onClick={handleSaveAll} disabled={saving || totalToSave === 0} className="w-full">
            {saving ? tc('saving') : t('saveAllCount', { count: totalToSave })}
          </Button>
        </div>
      </Modal>
    </>
  )
}
