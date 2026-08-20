'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApiError } from '@/lib/use-api-error'
import { useExpenseCategories, type ExpenseCategoryOption } from '@/lib/use-expense-categories'

export function ExpenseCategoriesCard() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const queryClient = useQueryClient()
  const { categories, label } = useExpenseCategories()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleting, setDeleting] = useState<ExpenseCategoryOption | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
    // Rows show a category name, so they have to be re-read after a rename.
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const response = await fetch('/api/expense-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    setSaving(false)
    if (!response.ok) {
      alert(apiError(await response.json().catch(() => ({})), t('categorySaveError')))
      return
    }
    setName('')
    refresh()
  }

  async function handleRename(id: number) {
    if (!editingName.trim()) return
    const response = await fetch(`/api/expense-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName.trim() }),
    })
    if (!response.ok) {
      alert(apiError(await response.json().catch(() => ({})), t('categorySaveError')))
      return
    }
    setEditingId(null)
    refresh()
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    const response = await fetch(`/api/expense-categories/${deleting.id}`, { method: 'DELETE' })
    setDeletePending(false)
    if (!response.ok) {
      // In use, or the Ostalo fallback -- both come back as a specific code.
      // Close either way: repeating the delete cannot succeed, and leaving the
      // dialog up blocks the page behind it.
      setDeleting(null)
      alert(apiError(await response.json().catch(() => ({})), t('categoryDeleteError')))
      return
    }
    setDeleting(null)
    refresh()
  }

  const inputClass = 'w-full rounded-card border border-line bg-surface px-3 py-2 text-fg'

  return (
    <section className="max-w-sm rounded-card border border-line bg-surface p-4">
      <h2 className="text-md font-semibold text-heading">{t('categoriesTitle')}</h2>
      <p className="mt-1 mb-3 text-sm text-muted">{t('categoriesHint')}</p>

      <ul className="mb-3 flex flex-col gap-1.5">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-2 rounded-card border border-line px-3 py-2">
            {editingId === category.id ? (
              <>
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className={inputClass}
                  aria-label={tc('name')}
                />
                <Button onClick={() => handleRename(category.id)}>{tc('save')}</Button>
                <Button variant="secondary" onClick={() => setEditingId(null)}>
                  {tc('no')}
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-base">{label(category)}</span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(category.id)
                    setEditingName(category.name)
                  }}
                >
                  {tc('edit')}
                </Button>
                <Button variant="danger" onClick={() => setDeleting(category)}>
                  {tc('delete')}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('categoryPlaceholder')}
          className={inputClass}
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? tc('saving') : tc('save')}
        </Button>
      </form>

      <ConfirmDialog
        open={deleting !== null}
        message={t('categoryConfirmDelete', { name: deleting ? label(deleting) : '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        pending={deletePending}
      />
    </section>
  )
}
