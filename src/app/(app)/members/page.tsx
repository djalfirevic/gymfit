'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'

type Member = { id: number; fullName: string; membershipRenewalDate: string }

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch('/api/members')
  if (!response.ok) throw new Error('Failed to load members')
  return response.json()
}

export default function MembersPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [fullName, setFullName] = useState('')
  const [renewalDate, setRenewalDate] = useState('')

  const filtered = useMemo(
    () => (data ?? []).filter((member) => member.fullName.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  )

  function openCreate() {
    setEditing(null)
    setFullName('')
    setRenewalDate('')
    setModalOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setFullName(member.fullName)
    setRenewalDate(member.membershipRenewalDate.slice(0, 10))
    setModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { fullName, membershipRenewalDate: renewalDate }
    if (editing) {
      await fetch(`/api/members/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  async function handleDelete(id: number) {
    if (!confirm('Obrisati člana?')) return
    await fetch(`/api/members/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  if (isLoading) return <p className="text-neutral-400">Učitavanje...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Članovi</h1>
        <Button onClick={openCreate}>+ Novi član</Button>
      </div>

      <input
        placeholder="Pretraga po imenu..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
      />

      <Table<Member>
        rows={filtered}
        columns={[
          { key: 'fullName', label: 'Ime i prezime', render: (row) => row.fullName },
          {
            key: 'renewal',
            label: 'Obnova članarine',
            render: (row) => {
              const overdue = new Date(row.membershipRenewalDate) < new Date()
              return (
                <span className={overdue ? 'font-medium text-red-400' : 'text-neutral-200'}>
                  {new Date(row.membershipRenewalDate).toLocaleDateString('sr-RS')}
                </span>
              )
            },
          },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(row)}>
                  Izmeni
                </Button>
                <Button variant="danger" onClick={() => handleDelete(row.id)}>
                  Obriši
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Izmena člana' : 'Novi član'}>
        <form onSubmit={handleSubmit}>
          <Field label="Ime i prezime" htmlFor="fullName">
            <input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Obnova članarine" htmlFor="renewalDate">
            <input
              id="renewalDate"
              type="date"
              value={renewalDate}
              onChange={(event) => setRenewalDate(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>
    </div>
  )
}
