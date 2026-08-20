'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-error'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/expenses/categorize'
import { normalizeName } from '@/lib/import/match-member'

type Member = { id: number; fullName: string }
type Product = { id: number; name: string; defaultPrice: string }

type EntryType = 'sale' | 'expense' | 'memberPayment'

type QueuedEntry =
  | { localId: number; type: 'sale'; productId: number; productName: string; soldAt: string; price: string; quantity: number }
  | { localId: number; type: 'expense'; expenseDate: string; description: string; amount: string; category: ExpenseCategory }
  | {
      localId: number
      type: 'memberPayment'
      memberId: number
      memberNameRaw: string
      amount: string
      renewalUntil: string
    }

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function summarize(entry: QueuedEntry): string {
  if (entry.type === 'sale') return `Prodaja: ${entry.productName} × ${entry.quantity} (${entry.price} RSD) — ${entry.soldAt}`
  if (entry.type === 'expense') return `Trošak: ${entry.description} (${entry.amount} RSD) — ${entry.expenseDate}`
  return `Uplata: ${entry.memberNameRaw} (${entry.amount} RSD, važi do ${entry.renewalUntil})`
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

export function QuickAdd() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [activeType, setActiveType] = useState<EntryType>('memberPayment')
  const [queue, setQueue] = useState<QueuedEntry[]>([])
  const [nextLocalId, setNextLocalId] = useState(1)
  const [saving, setSaving] = useState(false)

  const { data: members } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const { data: products } = useQuery({ queryKey: ['store-products'], queryFn: fetchProducts })

  // Sale fields
  const [saleProductId, setSaleProductId] = useState('')
  const [saleDate, setSaleDate] = useState(todayIso())
  const [salePrice, setSalePrice] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')

  // Expense fields
  const [expenseDate, setExpenseDate] = useState(todayIso())
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('ostalo')

  // Member + payment fields
  const [memberNameRaw, setMemberNameRaw] = useState('')
  const [resolvedMemberId, setResolvedMemberId] = useState<number | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [renewalUntil, setRenewalUntil] = useState('')
  const [creatingMember, setCreatingMember] = useState(false)
  const [locallyAddedMembers, setLocallyAddedMembers] = useState<Member[]>([])

  const knownMembers = [...(members ?? []), ...locallyAddedMembers]
  const matchedMember = knownMembers.find((member) => normalizeName(member.fullName) === normalizeName(memberNameRaw))
  const memberId = resolvedMemberId ?? matchedMember?.id ?? null
  const showNewMemberPrompt = memberNameRaw.trim().length > 0 && !matchedMember && resolvedMemberId === null

  function resetTypeFields() {
    setSaleProductId('')
    setSaleDate(todayIso())
    setSalePrice('')
    setSaleQuantity('1')
    setExpenseDate(todayIso())
    setExpenseDescription('')
    setExpenseAmount('')
    setExpenseCategory('ostalo')
    setMemberNameRaw('')
    setResolvedMemberId(null)
    setPaymentAmount('')
    setRenewalUntil('')
  }

  function closeAndReset() {
    setOpen(false)
    setQueue([])
    resetTypeFields()
  }

  async function handleCreateMember() {
    setCreatingMember(true)
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: memberNameRaw.trim(), membershipRenewalDate: renewalUntil || todayIso() }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        alert(errorMessage(body, 'Greška pri dodavanju člana'))
        return
      }
      setLocallyAddedMembers((current) => [...current, { id: body.id, fullName: body.fullName }])
      setResolvedMemberId(body.id)
    } finally {
      setCreatingMember(false)
    }
  }

  function addSaleToQueue() {
    const product = products?.find((item) => item.id === Number(saleProductId))
    if (!product || !saleDate || !salePrice) return
    setQueue((current) => [
      ...current,
      {
        localId: nextLocalId,
        type: 'sale',
        productId: product.id,
        productName: product.name,
        soldAt: saleDate,
        price: salePrice,
        quantity: Number(saleQuantity) || 1,
      },
    ])
    setNextLocalId((id) => id + 1)
    setSaleProductId('')
    setSalePrice('')
    setSaleQuantity('1')
  }

  function addExpenseToQueue() {
    if (!expenseDate || !expenseDescription || !expenseAmount) return
    setQueue((current) => [
      ...current,
      { localId: nextLocalId, type: 'expense', expenseDate, description: expenseDescription, amount: expenseAmount, category: expenseCategory },
    ])
    setNextLocalId((id) => id + 1)
    setExpenseDescription('')
    setExpenseAmount('')
    setExpenseCategory('ostalo')
  }

  function addMemberPaymentToQueue() {
    if (!memberId || !paymentAmount || !renewalUntil) return
    setQueue((current) => [
      ...current,
      { localId: nextLocalId, type: 'memberPayment', memberId, memberNameRaw: memberNameRaw.trim(), amount: paymentAmount, renewalUntil },
    ])
    setNextLocalId((id) => id + 1)
    setMemberNameRaw('')
    setResolvedMemberId(null)
    setPaymentAmount('')
    setRenewalUntil('')
  }

  function removeFromQueue(localId: number) {
    setQueue((current) => current.filter((entry) => entry.localId !== localId))
  }

  async function handleSaveAll() {
    setSaving(true)
    const failed: QueuedEntry[] = []
    const usedYears = new Set<number>()

    for (const entry of queue) {
      try {
        if (entry.type === 'sale') {
          const response = await fetch('/api/store/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: entry.productId, soldAt: entry.soldAt, price: entry.price, quantity: entry.quantity }),
          })
          if (!response.ok) throw new Error()
          usedYears.add(new Date(entry.soldAt).getFullYear())
        } else if (entry.type === 'expense') {
          const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expenseDate: entry.expenseDate,
              description: entry.description,
              amount: entry.amount,
              category: entry.category,
            }),
          })
          if (!response.ok) throw new Error()
          usedYears.add(new Date(entry.expenseDate).getFullYear())
        } else {
          const paymentResponse = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberNameRaw: entry.memberNameRaw, paidAt: todayIso(), amount: entry.amount }),
          })
          if (!paymentResponse.ok) throw new Error()
          const renewalResponse = await fetch(`/api/members/${entry.memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ membershipRenewalDate: entry.renewalUntil }),
          })
          if (!renewalResponse.ok) throw new Error()
          usedYears.add(new Date().getFullYear())
        }
      } catch {
        failed.push(entry)
      }
    }

    queryClient.invalidateQueries({ queryKey: ['members'] })
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    queryClient.invalidateQueries({ queryKey: ['store-products'] })
    queryClient.invalidateQueries({ queryKey: ['store-sales'] })
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    for (const year of usedYears) {
      queryClient.invalidateQueries({ queryKey: ['dashboard', year] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-expenses', year] })
    }

    setSaving(false)
    if (failed.length > 0) {
      setQueue(failed)
      alert(`${failed.length} od ${queue.length} stavki nije sačuvano. Ostale su u listi — pokušajte ponovo.`)
      return
    }
    closeAndReset()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        + Novi upis
      </Button>

      <Modal open={open} onClose={closeAndReset} title="Novi upis" size="lg">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant={activeType === 'memberPayment' ? 'primary' : 'secondary'} onClick={() => setActiveType('memberPayment')}>
              Član + uplata
            </Button>
            <Button variant={activeType === 'sale' ? 'primary' : 'secondary'} onClick={() => setActiveType('sale')}>
              Prodaja
            </Button>
            <Button variant={activeType === 'expense' ? 'primary' : 'secondary'} onClick={() => setActiveType('expense')}>
              Trošak
            </Button>
          </div>

          {activeType === 'memberPayment' && (
            <div className="flex flex-col gap-2 rounded-card border border-line p-3">
              <Field label="Ime člana" htmlFor="qa-member-name">
                <input
                  id="qa-member-name"
                  value={memberNameRaw}
                  onChange={(event) => {
                    setMemberNameRaw(event.target.value)
                    setResolvedMemberId(null)
                  }}
                  list="qa-member-names"
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
                <datalist id="qa-member-names">
                  {knownMembers.map((member) => (
                    <option key={member.id} value={member.fullName} />
                  ))}
                </datalist>
              </Field>
              {showNewMemberPrompt && (
                <div className="flex items-center justify-between rounded-card bg-surface-2 px-3 py-2 text-sm text-warning">
                  <span>Novi član?</span>
                  <Button type="button" onClick={handleCreateMember} disabled={creatingMember}>
                    {creatingMember ? '...' : 'Dodaj člana'}
                  </Button>
                </div>
              )}
              <Field label="Iznos (RSD)" htmlFor="qa-payment-amount">
                <input
                  id="qa-payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Field label="Važi do" htmlFor="qa-renewal-until">
                <input
                  id="qa-renewal-until"
                  type="date"
                  value={renewalUntil}
                  onChange={(event) => setRenewalUntil(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={addMemberPaymentToQueue}
                disabled={!memberId || !paymentAmount || !renewalUntil}
              >
                Dodaj u listu
              </Button>
            </div>
          )}

          {activeType === 'sale' && (
            <div className="flex flex-col gap-2 rounded-card border border-line p-3">
              <Field label="Proizvod" htmlFor="qa-sale-product">
                <select
                  id="qa-sale-product"
                  value={saleProductId}
                  onChange={(event) => setSaleProductId(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                >
                  <option value="" disabled>
                    Izaberi proizvod
                  </option>
                  {(products ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Datum" htmlFor="qa-sale-date">
                <input
                  id="qa-sale-date"
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Field label="Cena (RSD)" htmlFor="qa-sale-price">
                <input
                  id="qa-sale-price"
                  type="number"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Field label="Količina" htmlFor="qa-sale-quantity">
                <input
                  id="qa-sale-quantity"
                  type="number"
                  min="1"
                  value={saleQuantity}
                  onChange={(event) => setSaleQuantity(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Button type="button" variant="secondary" onClick={addSaleToQueue} disabled={!saleProductId || !salePrice}>
                Dodaj u listu
              </Button>
            </div>
          )}

          {activeType === 'expense' && (
            <div className="flex flex-col gap-2 rounded-card border border-line p-3">
              <Field label="Datum" htmlFor="qa-expense-date">
                <input
                  id="qa-expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Field label="Naziv" htmlFor="qa-expense-description">
                <input
                  id="qa-expense-description"
                  value={expenseDescription}
                  onChange={(event) => setExpenseDescription(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Field label="Iznos (RSD)" htmlFor="qa-expense-amount">
                <input
                  id="qa-expense-amount"
                  type="number"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                />
              </Field>
              <Field label="Kategorija" htmlFor="qa-expense-category">
                <select
                  id="qa-expense-category"
                  value={expenseCategory}
                  onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory)}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
                >
                  {EXPENSE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {EXPENSE_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={addExpenseToQueue}
                disabled={!expenseDescription || !expenseAmount}
              >
                Dodaj u listu
              </Button>
            </div>
          )}

          {queue.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted">Za čuvanje ({queue.length})</h3>
              {queue.map((entry) => (
                <div
                  key={entry.localId}
                  className="flex items-center justify-between rounded-card border border-line px-3 py-2 text-sm text-fg"
                >
                  <span>{summarize(entry)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(entry.localId)}
                    className="text-muted hover:text-fg"
                    aria-label="Ukloni"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button onClick={handleSaveAll} disabled={saving}>
                {saving ? 'Čuvanje...' : 'Sačuvaj sve'}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
