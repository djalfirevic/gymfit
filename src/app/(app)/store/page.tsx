'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { ProductCountsChart } from '@/components/charts/ProductCountsChart'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Table } from '@/components/ui/Table'
import { useApiError } from '@/lib/use-api-error'
import { useFormat } from '@/lib/use-format'
import { usePagination } from '@/lib/use-pagination'

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
  const t = useTranslations('store')
  const tc = useTranslations('common')
  const apiError = useApiError()
  const fmt = useFormat()
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
  const [saleSearch, setSaleSearch] = useState('')

  async function handleCreateProduct(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/store/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: productName, defaultPrice: productPrice }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      alert(apiError(body, t('productSaveError')))
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
      alert(apiError(body, t('saleSaveError')))
      return
    }
    setSaleModalOpen(false)
    setSaleDate('')
    setSalePrice('')
    setSaleQuantity('1')
    queryClient.invalidateQueries({ queryKey: ['store-sales'] })
  }

  const productById = useMemo(
    () => new Map((products ?? []).map((product) => [product.id, product])),
    [products],
  )
  const filteredSales = useMemo(
    () =>
      (sales ?? []).filter((sale) =>
        (productById.get(sale.productId)?.name ?? '').toLowerCase().includes(saleSearch.toLowerCase()),
      ),
    [sales, productById, saleSearch],
  )
  const { page: salesPage, totalPages: salesTotalPages, pageItems: salesPageItems, setPage: setSalesPage } =
    usePagination(filteredSales)

  if (productsLoading || salesLoading) return <p className="text-muted">{tc('loading')}</p>

  const currentYear = new Date().getFullYear()
  const chartData = (sales ?? [])
    .filter((sale) => new Date(sale.soldAt).getFullYear() === currentYear)
    .map((sale) => ({
      productName: productById.get(sale.productId)?.name ?? '?',
      soldAt: sale.soldAt,
      quantity: sale.quantity,
    }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">{t('title')}</h1>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">{t('salesByProductAndMonth', { year: currentYear })}</h2>
        <ProductCountsChart data={chartData} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-md font-semibold text-heading">{t('products')}</h2>
          <Button onClick={() => setProductModalOpen(true)}>{t('newProduct')}</Button>
        </div>
        <Table<Product>
          rows={products ?? []}
          columns={[
            { key: 'name', label: tc('name'), render: (row) => row.name },
            { key: 'price', label: tc('price'), render: (row) => fmt.rsd(Number(row.defaultPrice)) },
            { key: 'active', label: t('active'), render: (row) => (row.active ? tc('yes') : tc('no')) },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-md font-semibold text-heading">{t('sales')}</h2>
          <Button onClick={() => setSaleModalOpen(true)}>{t('newSale')}</Button>
        </div>
        <div className="flex items-center justify-between gap-4">
          <input
            placeholder={t('searchPlaceholder')}
            value={saleSearch}
            onChange={(event) => {
              setSaleSearch(event.target.value)
              setSalesPage(1)
            }}
            className="w-full max-w-sm rounded-card border border-line bg-surface px-3 py-2 text-fg"
          />
          <span className="whitespace-nowrap text-sm text-muted">
            Prikazano {filteredSales.length} od {sales?.length ?? 0}
          </span>
        </div>
        <Table<Sale>
          rows={salesPageItems}
          columns={[
            { key: 'product', label: t('product'), render: (row) => productById.get(row.productId)?.name ?? '?' },
            { key: 'date', label: tc('date'), render: (row) => fmt.date(row.soldAt) },
            { key: 'quantity', label: tc('quantity'), render: (row) => String(row.quantity) },
            { key: 'price', label: tc('price'), render: (row) => fmt.rsd(Number(row.price)) },
          ]}
        />
        <Pagination page={salesPage} totalPages={salesTotalPages} onPageChange={setSalesPage} />
      </div>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title={t('newProductTitle')}>
        <form onSubmit={handleCreateProduct}>
          <Field label={tc('name')} htmlFor="productName">
            <input
              id="productName"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={tc('priceRsd')} htmlFor="productPrice">
            <input
              id="productPrice"
              type="number"
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            {tc('save')}
          </Button>
        </form>
      </Modal>

      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} title={t('newSaleTitle')}>
        <form onSubmit={handleCreateSale}>
          <Field label={t('product')} htmlFor="saleProductId">
            <select
              id="saleProductId"
              value={saleProductId}
              onChange={(event) => setSaleProductId(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
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
          <Field label={tc('date')} htmlFor="saleDate">
            <input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={tc('priceRsd')} htmlFor="salePrice">
            <input
              id="salePrice"
              type="number"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Field label={tc('quantity')} htmlFor="saleQuantity">
            <input
              id="saleQuantity"
              type="number"
              min="1"
              value={saleQuantity}
              onChange={(event) => setSaleQuantity(event.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            {tc('save')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
