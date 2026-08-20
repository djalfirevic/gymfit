'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-error'

type Location = { id: number; name: string; address: string; latitude: string; longitude: string }

// Leaflet touches `window` at module scope, so it can never render on the server.
const LocationMap = dynamic(() => import('@/components/map/LocationMap').then((mod) => mod.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center rounded-card border border-line bg-surface-2 text-muted">
      Učitavanje mape...
    </div>
  ),
})

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations')
  if (!response.ok) throw new Error('Failed to load locations')
  return response.json()
}

const INPUT_CLASS = 'w-full rounded-card border border-line bg-surface px-3 py-2 text-fg'

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const { data: locations, isLoading } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations })

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  function openCreate() {
    setEditing(null)
    setName('')
    setAddress('')
    setLatitude('')
    setLongitude('')
    setModalOpen(true)
  }

  function openEdit(location: Location) {
    setEditing(location)
    setName(location.name)
    setAddress(location.address)
    setLatitude(location.latitude)
    setLongitude(location.longitude)
    setModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { name, address, latitude, longitude }
    const response = editing
      ? await fetch(`/api/locations/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(errorMessage(body, 'Greška pri čuvanju lokacije'))
      return
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['locations'] })
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati lokaciju?')) return
    const response = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      alert('Greška pri brisanju lokacije')
      return
    }
    if (selectedId === id) setSelectedId(null)
    queryClient.invalidateQueries({ queryKey: ['locations'] })
  }

  if (isLoading) return <p className="text-muted">Učitavanje...</p>

  const rows = locations ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">Lokacije</h1>
        <Button onClick={openCreate}>+ Nova lokacija</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-3">
          {rows.length === 0 && (
            <p className="rounded-card border border-line bg-surface p-4 text-muted">
              Još nema unetih lokacija.
            </p>
          )}
          {rows.map((location) => (
            <div
              key={location.id}
              className={
                selectedId === location.id
                  ? 'rounded-card border border-primary bg-surface p-4 transition-colors'
                  : 'rounded-card border border-line bg-surface p-4 transition-colors hover:border-primary'
              }
            >
              {/* Only the summary selects the pin -- the actions below must not
                  nest inside a button. */}
              <button type="button" onClick={() => setSelectedId(location.id)} className="w-full text-left">
                <div className="text-md font-semibold text-heading">{location.name}</div>
                <div className="mt-1 text-base text-muted">{location.address}</div>
                <div className="tabular mt-2 text-sm text-muted">
                  {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                </div>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openEdit(location)}>
                  Izmeni
                </Button>
                <Button variant="danger" onClick={() => handleDelete(location.id)}>
                  Obriši
                </Button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-card border border-line px-3.5 py-2 text-base font-medium text-fg transition-colors hover:border-primary hover:text-primary"
                >
                  Uputstvo
                </a>
              </div>
            </div>
          ))}
        </div>

        <LocationMap locations={rows} selectedId={selectedId} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Izmena lokacije' : 'Nova lokacija'}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Naziv" htmlFor="name">
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={INPUT_CLASS}
              required
            />
          </Field>
          <Field label="Adresa" htmlFor="address">
            <input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={INPUT_CLASS}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Geografska širina" htmlFor="latitude">
              <input
                id="latitude"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                className={INPUT_CLASS}
                placeholder="44.8514798"
                required
              />
            </Field>
            <Field label="Geografska dužina" htmlFor="longitude">
              <input
                id="longitude"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                className={INPUT_CLASS}
                placeholder="20.3500288"
                required
              />
            </Field>
          </div>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
