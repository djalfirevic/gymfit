import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/lib/locale'

// No locale segment in the URL -- this app is auth-gated and internal, so the
// choice lives in a cookie and every route keeps its plain path.
export default getRequestConfig(async () => {
  const store = await cookies()
  const stored = store.get(LOCALE_COOKIE)?.value
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
