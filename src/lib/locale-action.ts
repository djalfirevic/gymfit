'use server'

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, type Locale } from '@/lib/locale'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  })
}
