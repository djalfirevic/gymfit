import { INTL_LOCALE } from '@/lib/locale'

// Formatting follows the UI language -- 1.234.567 in Serbian, 1,234,567 in
// English -- but the currency itself never changes. Defaults keep the Serbian
// format for callers with no locale in hand (scripts, tests).
const DEFAULT_INTL_LOCALE = INTL_LOCALE.sr

export function convertRsdToEur(amountRsd: number, rate: number): number {
  if (!(rate > 0)) {
    throw new Error(`Invalid RSD→EUR rate: ${rate}`)
  }
  return amountRsd / rate
}

export function formatRsd(amount: number, locale: string = DEFAULT_INTL_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatEur(amount: number, locale: string = DEFAULT_INTL_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(amount * 100) / 100)
}

// Plain thousands-separated number, no currency symbol — for chart axis
// ticks and other tight spaces where a full currency string is too wide.
export function formatNumber(amount: number, locale: string = DEFAULT_INTL_LOCALE): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)
}
