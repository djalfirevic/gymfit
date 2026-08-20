export const LOCALES = ['sr', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'sr'

export const LOCALE_COOKIE = 'gymfit-locale'

/** Intl tags -- 'sr' alone would format dates and numbers for the wrong region. */
export const INTL_LOCALE: Record<Locale, string> = {
  sr: 'sr-RS',
  en: 'en-GB',
}

export const LOCALE_LABELS: Record<Locale, string> = {
  sr: 'SRB',
  en: 'EN',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
