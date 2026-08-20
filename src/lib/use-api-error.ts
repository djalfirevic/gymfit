'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { errorMessage } from '@/lib/api-error'

/**
 * `errorMessage` bound to the errors namespace. Codes the catalog doesn't know
 * fall through as-is rather than rendering a missing-message placeholder.
 */
export function useApiError() {
  const t = useTranslations('errors')

  return useCallback(
    (body: unknown, fallback: string) =>
      errorMessage(body, fallback, (code) => (t.has(code) ? t(code) : code)),
    [t],
  )
}
