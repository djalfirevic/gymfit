import { useMemo, useState } from 'react'

const PAGE_SIZE = 50

export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage],
  )
  return { page: safePage, totalPages, pageItems, setPage }
}
