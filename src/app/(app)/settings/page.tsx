'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useApiError } from '@/lib/use-api-error'

async function fetchSettings(): Promise<{ rsdToEurRate: number }> {
  const response = await fetch('/api/settings')
  if (!response.ok) throw new Error('Failed to load settings')
  return response.json()
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const [rate, setRate] = useState('')
  const [saved, setSaved] = useState(false)
  const [syncedRate, setSyncedRate] = useState<number | null>(null)
  const [loadingLiveRate, setLoadingLiveRate] = useState(false)
  const [liveRateError, setLiveRateError] = useState<string | null>(null)

  if (data && data.rsdToEurRate !== syncedRate) {
    setSyncedRate(data.rsdToEurRate)
    setRate(String(data.rsdToEurRate))
  }

  async function handleReloadLiveRate() {
    setLoadingLiveRate(true)
    setLiveRateError(null)
    try {
      const response = await fetch('/api/settings/live-rate')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        // Fetch failed — leave the current (static) value exactly as it was.
        setLiveRateError(apiError(body, t('liveRateError')))
        return
      }
      setRate(String(body.rate))
    } catch {
      setLiveRateError(t('liveRateError'))
    } finally {
      setLoadingLiveRate(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsdToEurRate: Number(rate) }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(apiError(body, t('rateSaveError')))
      return
    }
    setSaved(true)
    queryClient.invalidateQueries({ queryKey: ['settings'] })
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <p className="text-muted">{tc('loading')}</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>
      <form onSubmit={handleSubmit} className="max-w-sm rounded-card border border-line bg-surface p-4">
        <Field label={t('rate')} htmlFor="rate">
          <div className="flex gap-2">
            <input
              id="rate"
              type="number"
              step="0.0001"
              min="0.0001"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
            <Button type="button" variant="secondary" onClick={handleReloadLiveRate} disabled={loadingLiveRate} title={t('reloadRate')}>
              {loadingLiveRate ? '...' : '↻'}
            </Button>
          </div>
          {liveRateError && <p className="mt-1 text-xs text-warning">{liveRateError}</p>}
        </Field>
        <Button type="submit">{saved ? tc('saved') : tc('save')}</Button>
      </form>

      <section className="max-w-sm rounded-card border border-line bg-surface p-4">
        <h2 className="text-md font-semibold text-heading">{t('exportTitle')}</h2>
        <p className="mt-1 mb-3 text-sm text-muted">{t('exportHint')}</p>
        {/* A plain link, not fetch+blob: the browser streams it straight to disk
            and the Content-Disposition filename is honoured. */}
        <a
          href="/api/export"
          className="inline-block rounded-card bg-primary px-3.5 py-2 text-base font-medium text-primary-fg transition-colors hover:bg-primary-hover"
        >
          {t('exportButton')}
        </a>
      </section>
    </div>
  )
}
