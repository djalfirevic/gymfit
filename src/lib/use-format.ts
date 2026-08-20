'use client'

import { useLocale } from 'next-intl'
import { useMemo } from 'react'
import { formatEur, formatNumber, formatRsd } from '@/lib/currency'
import { INTL_LOCALE, isLocale } from '@/lib/locale'

/**
 * Binds the active UI language to the formatting helpers, so every amount and
 * date on screen uses one locale instead of the hardcoded sr-RS these call
 * sites used to carry.
 */
export function useFormat() {
  const locale = useLocale()
  const intlLocale = isLocale(locale) ? INTL_LOCALE[locale] : INTL_LOCALE.sr

  return useMemo(
    () => ({
      rsd: (amount: number) => formatRsd(amount, intlLocale),
      eur: (amount: number) => formatEur(amount, intlLocale),
      number: (amount: number) => formatNumber(amount, intlLocale),
      date: (value: string | Date) => new Date(value).toLocaleDateString(intlLocale),
    }),
    [intlLocale],
  )
}
