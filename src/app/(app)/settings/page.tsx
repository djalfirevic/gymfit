'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

async function fetchSettings(): Promise<{ rsdToEurRate: number }> {
  const response = await fetch('/api/settings')
  if (!response.ok) throw new Error('Failed to load settings')
  return response.json()
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const [rate, setRate] = useState('')
  const [saved, setSaved] = useState(false)
  const [syncedRate, setSyncedRate] = useState<number | null>(null)

  if (data && data.rsdToEurRate !== syncedRate) {
    setSyncedRate(data.rsdToEurRate)
    setRate(String(data.rsdToEurRate))
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
      alert(body.error ?? 'Greška pri čuvanju kursa')
      return
    }
    setSaved(true)
    queryClient.invalidateQueries({ queryKey: ['settings'] })
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Podešavanja</h1>
      <form onSubmit={handleSubmit} className="max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <Field label="Kurs RSD → EUR" htmlFor="rate">
          <input
            id="rate"
            type="number"
            step="0.0001"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
            required
          />
        </Field>
        <Button type="submit">{saved ? 'Sačuvano ✓' : 'Sačuvaj'}</Button>
      </form>
    </div>
  )
}
