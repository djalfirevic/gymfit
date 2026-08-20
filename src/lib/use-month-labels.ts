'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

/** Short month names, index 0 = January -- shared by every chart's x-axis. */
export function useMonthLabels(): string[] {
  const t = useTranslations('months.short')
  return useMemo(() => MONTH_NUMBERS.map((month) => t(String(month))), [t])
}

/** Full month names, index 0 = January -- used by the statistics table. */
export function useMonthNames(): string[] {
  const t = useTranslations('months.long')
  return useMemo(() => MONTH_NUMBERS.map((month) => t(String(month))), [t])
}
