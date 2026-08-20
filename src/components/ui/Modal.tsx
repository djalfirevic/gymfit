'use client'

import clsx from 'clsx'

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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={clsx(
          'w-full rounded-xl border border-neutral-800 bg-neutral-950 p-6',
          size === 'lg' ? 'max-w-3xl' : 'max-w-md',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white" aria-label="Zatvori">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
