'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  size?: 'md' | 'lg'
  children: React.ReactNode
}) {
  const t = useTranslations('common')

  if (!open) return null
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={clsx(
          'animate-pop-in max-h-full w-full overflow-y-auto rounded-card border border-line bg-surface shadow-lg',
          size === 'lg' ? 'max-w-3xl' : 'max-w-md',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-md font-semibold text-heading">{title}</h2>
          <button onClick={onClose} className="text-muted transition-colors hover:text-fg" aria-label={t('close')}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
