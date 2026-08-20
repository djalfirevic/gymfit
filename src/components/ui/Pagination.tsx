import { useTranslations } from 'next-intl'

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const t = useTranslations('pagination')

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-4 text-base text-muted">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-card border border-line px-3 py-1.5 text-fg transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg"
      >
        {t('previous')}
      </button>
      <span className="tabular">{t('pageOf', { page, total: totalPages })}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-card border border-line px-3 py-1.5 text-fg transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg"
      >
        {t('next')}
      </button>
    </div>
  )
}
