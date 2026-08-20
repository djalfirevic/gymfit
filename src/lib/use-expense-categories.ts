'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

export type ExpenseCategoryOption = { id: number; slug: string | null; name: string }

export async function fetchExpenseCategories(): Promise<ExpenseCategoryOption[]> {
  const response = await fetch('/api/expense-categories')
  if (!response.ok) throw new Error('Failed to load expense categories')
  return response.json()
}

/**
 * The five original categories carry a slug matching a key in the messages
 * catalog, so they still switch language. Categories added from the app have
 * no slug and show the name as typed -- the same rule as product and member
 * names, which are data rather than interface.
 */
export function useExpenseCategories() {
  const t = useTranslations('categories')
  const { data, isLoading } = useQuery({ queryKey: ['expense-categories'], queryFn: fetchExpenseCategories })
  // Memoised so labelById below keeps a stable identity between renders.
  const categories = useMemo(() => data ?? [], [data])

  const label = useCallback(
    (category: Pick<ExpenseCategoryOption, 'slug' | 'name'> | undefined) => {
      if (!category) return ''
      return category.slug && t.has(category.slug) ? t(category.slug) : category.name
    },
    [t],
  )

  const labelById = useCallback(
    (id: number) => label(categories.find((category) => category.id === id)),
    [categories, label],
  )

  return { categories, isLoading, label, labelById }
}
