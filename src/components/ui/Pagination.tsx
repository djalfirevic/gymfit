export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-neutral-400">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-neutral-700 px-3 py-1 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Prethodna
      </button>
      <span>
        Strana {page} od {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-neutral-700 px-3 py-1 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sledeća →
      </button>
    </div>
  )
}
