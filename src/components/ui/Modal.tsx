'use client'

import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

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

  // Escape is how people expect to leave an overlay, and the mobile drawer
  // already behaves that way. The hook runs unconditionally and guards inside,
  // since the early return below would otherwise make it a conditional hook.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // `open` is always false on the server, so document is guaranteed to exist by
  // the time this renders anything; the guard is belt and braces.
  if (!open || typeof document === 'undefined') return null

  const content = (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
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

  // Portalled to the body because `position: fixed` is contained by any
  // ancestor carrying a transform -- which the animated mobile drawer does.
  // Rendered in place, the Novi upis modal was trapped inside the drawer's
  // 250px panel instead of covering the screen.
  return createPortal(content, document.body)
}
