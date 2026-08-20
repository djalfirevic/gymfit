'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setSubmitting(false)
    if (!response.ok) {
      const body = await response.json()
      setError(body.error ?? 'Greška pri prijavi')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card border border-line bg-surface p-8">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-fg">GYMFIT</h1>
        <Field label="Lozinka" htmlFor="password">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
            required
          />
        </Field>
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Prijavljivanje...' : 'Prijavi se'}
        </Button>
      </form>
    </div>
  )
}
