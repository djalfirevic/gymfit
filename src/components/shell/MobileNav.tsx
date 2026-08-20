'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Nav } from '@/components/shell/Nav'

/**
 * Below md the sidebar is hidden, so this is the only way to reach any page.
 * Nav is reused verbatim rather than duplicated, so new links appear in both
 * places automatically.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('nav')

  // A drawer that leaves the page scrolling behind it feels broken, and Escape
  // is the expected way out of an overlay.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('menu')}
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-card border border-line text-muted transition-colors hover:border-primary hover:text-primary md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t('close')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 w-[250px] border-r border-line bg-surface shadow-lg">
            {/* Closing on navigation keeps the drawer from covering the page
                the user just asked for. */}
            <Nav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
