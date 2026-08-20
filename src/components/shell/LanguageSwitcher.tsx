'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/lib/locale'
import { setLocaleCookie } from '@/lib/locale-action'

export function LanguageSwitcher() {
  const active = useLocale() as Locale
  const t = useTranslations('language')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(locale: Locale) {
    if (locale === active) return
    startTransition(async () => {
      await setLocaleCookie(locale)
      // Messages are resolved on the server from the cookie, so the tree has to
      // be re-fetched rather than re-rendered from what the client already has.
      router.refresh()
    })
  }

  return (
    <div className="flex items-center rounded-card border border-line" role="group" aria-label={t('label')}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          disabled={pending}
          aria-pressed={locale === active}
          className={
            locale === active
              ? 'rounded-card bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-fg'
              : 'rounded-card px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary disabled:opacity-60'
          }
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  )
}
