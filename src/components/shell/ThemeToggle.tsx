'use client'

import { setTheme, useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const theme = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="grid h-8 w-8 place-items-center rounded-card border border-line text-muted transition-colors hover:border-primary hover:text-primary"
      aria-label={isDark ? 'Uključi svetlu temu' : 'Uključi tamnu temu'}
      title={isDark ? 'Svetla tema' : 'Tamna tema'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1.8v2.4M12 19.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M1.8 12h2.4M19.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
