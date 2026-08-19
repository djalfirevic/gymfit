'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ProductCountsChart } from '@/components/charts/ProductCountsChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { formatRsd } from '@/lib/currency'

type Product = { id: number; name: string; defaultPrice: string; active: boolean }
type Sale = { id: number; productId: number; soldAt: string; price: string; quantity: number }

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/store/products')
  if (!response.ok) throw new Error('Failed to load products')
  return response.json()
}

async function fetchSales(): Promise<Sale[]> {
  const response = await fetch('/api/store/sales')
  if (!response.ok) throw new Error('Failed to load sales')
  return response.json()
}

export default function StorePage() {
  const queryClient = useQueryClient()
  const { data: products, isLoading: productsLoading } = useQuery({ queryKey: ['store-products'], queryFn: fetchProducts })
  const { data: sales, isLoading: salesLoading } = useQuery({ queryKey: ['store-sales'], queryFn: fetchSales })

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')

  const [saleModalOpen, setSaleModalOpen] = useState(false)
  const [saleProductId, setSaleProductId] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')

  async function handleCreateProduct(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/store/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: productName, defaultPrice: productPrice }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(body.error ?? 'Greška pri čuvanju proizvoda')
      return
    }
    setProductModalOpen(false)
    setProductName('')
    setProductPrice('')
    queryClient.invalidateQueries({ queryKey: ['store-products'] })
  }

  async function handleCreateSale(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/store/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: Number(saleProductId),
        soldAt: saleDate,
        price: salePrice,
        quantity: Number(saleQuantity),
      }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(body.error ?? 'Greška pri čuvanju prodaje')
      return
    }
    setSaleModalOpen(false)
    setSaleDate('')
    setSalePrice('')
    setSaleQuantity('1')
    queryClient.invalidateQueries({ queryKey: ['store-sales'] })
  }

  if (productsLoading || salesLoading) return <p className="text-neutral-400">Učitavanje...</p>

  const productById = new Map((products ?? []).map((product) => [product.id, product]))
  const chartData = (sales ?? []).map((sale) => ({
    productName: productById.get(sale.productId)?.name ?? '?',
    soldAt: sale.soldAt,
    quantity: sale.quantity,
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Prodavnica</h1>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Prodaja po proizvodu i mesecu</h2>
        <ProductCountsChart data={chartData} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Proizvodi</h2>
          <Button onClick={() => setProductModalOpen(true)}>+ Novi proizvod</Button>
        </div>
        <Table<Product>
          rows={products ?? []}
          columns={[
            { key: 'name', label: 'Naziv', render: (row) => row.name },
            { key: 'price', label: 'Cena', render: (row) => formatRsd(Number(row.defaultPrice)) },
            { key: 'active', label: 'Aktivan', render: (row) => (row.active ? 'Da' : 'Ne') },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prodaja</h2>
          <Button onClick={() => setSaleModalOpen(true)}>+ Nova prodaja</Button>
        </div>
        <Table<Sale>
          rows={sales ?? []}
          columns={[
            { key: 'product', label: 'Proizvod', render: (row) => productById.get(row.productId)?.name ?? '?' },
            { key: 'date', label: 'Datum', render: (row) => new Date(row.soldAt).toLocaleDateString('sr-RS') },
            { key: 'quantity', label: 'Količina', render: (row) => String(row.quantity) },
            { key: 'price', label: 'Cena', render: (row) => formatRsd(Number(row.price)) },
          ]}
        />
      </div>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title="Novi proizvod">
        <form onSubmit={handleCreateProduct}>
          <Field label="Naziv" htmlFor="productName">
            <input
              id="productName"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Cena (RSD)" htmlFor="productPrice">
            <input
              id="productPrice"
              type="number"
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Sačuvaj
          </Button>
        </form>
      </Modal>

      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} title="Nova prodaja">
        <form onSubmit={handleCreateSale}>
          <Field label="Proizvod" htmlFor="saleProductId">
            <select
              id="saleProductId"
              value={saleProductId}
              onChange={(event) => setSaleProductId(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            >
              <option value="" disabled>
                Izaberi proizvod
              </option>
              {(products ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Datum" htmlFor="saleDate">
            <input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Cena (RSD)" htmlFor="salePrice">
            <input
              id="salePrice"
              type="number"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              required
            />
          </Field>
          <Field label="Količina" htmlFor="saleQuantity">
            <input
              id="saleQuantity"
              type="number"
              min="1"
              value={saleQuantity}
              onChange={(event) => setSaleQuantity(event.target.value)}
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
