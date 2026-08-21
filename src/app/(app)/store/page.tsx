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
type SaleRow = { localId: number; productId: number | ''; soldAt: string; price: string; quantity: string }

function emptySaleRow(localId: number): SaleRow {
  return { localId, productId: '', soldAt: '', price: '', quantity: '1' }
}

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productActive, setProductActive] = useState(true)

  const [saleModalOpen, setSaleModalOpen] = useState(false)
  const [saleRows, setSaleRows] = useState<SaleRow[]>([emptySaleRow(1)])
  const [nextSaleRowId, setNextSaleRowId] = useState(2)
  const [savingSales, setSavingSales] = useState(false)
  const [saleSearch, setSaleSearch] = useState('')

  const productById = useMemo(
    () => new Map((products ?? []).map((product) => [product.id, product])),
    [products],
  )

  // What a product last actually sold for, which tracks reality better than
  // its stored default -- Dnevni termin is recorded at 500 but has sold at 700
  // since June, and the default cannot be edited from the app.
  const lastPriceByProduct = useMemo(() => {
    const latest = new Map<number, { soldAt: string; price: string }>()
    for (const sale of sales ?? []) {
      const current = latest.get(sale.productId)
      if (!current || sale.soldAt > current.soldAt) {
        latest.set(sale.productId, { soldAt: sale.soldAt, price: sale.price })
      }
    }
    return new Map([...latest].map(([id, entry]) => [id, entry.price]))
  }, [sales])

  function openCreateProduct() {
    setEditingProduct(null)
    setProductName('')
    setProductPrice('')
    setProductActive(true)
    setProductModalOpen(true)
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product)
    setProductName(product.name)
    setProductPrice(String(Number(product.defaultPrice)))
    setProductActive(product.active)
    setProductModalOpen(true)
  }

  async function handleSaveProduct(event: React.FormEvent) {
    event.preventDefault()
    // The price here is only what new sales start from. Sales already recorded
    // keep the price they were sold at, so correcting this never rewrites
    // history or moves any past total.
    const payload = { name: productName, defaultPrice: productPrice, active: productActive }
    const response = editingProduct
      ? await fetch(`/api/store/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/store/products', {
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
    queryClient.invalidateQueries({ queryKey: ['store-products'] })
  }

  function openSaleModal() {
    setSaleRows([emptySaleRow(1)])
    setNextSaleRowId(2)
    setSaleModalOpen(true)
  }

  function addSaleRow() {
    // The date usually repeats down a batch, so carry it into the new row
    // rather than making it be typed again for every line.
    const last = saleRows[saleRows.length - 1]
    setSaleRows((current) => [...current, { ...emptySaleRow(nextSaleRowId), soldAt: last?.soldAt ?? '' }])
    setNextSaleRowId((id) => id + 1)
  }

  function removeSaleRow(localId: number) {
    setSaleRows((current) => (current.length > 1 ? current.filter((row) => row.localId !== localId) : current))
  }

  function updateSaleRow(localId: number, patch: Partial<SaleRow>) {
    setSaleRows((current) =>
      current.map((row) => {
        if (row.localId !== localId) return row
        const next = { ...row, ...patch }
        // Picking a product fills in its usual price, which is right nearly
        // every time; typing over it still wins.
        if (patch.productId !== undefined && !row.price) {
          const productId = Number(patch.productId)
          const price = lastPriceByProduct.get(productId) ?? productById.get(productId)?.defaultPrice
          if (price !== undefined) next.price = String(Number(price))
        }
        return next
      }),
    )
  }

  async function handleCreateSales(event: React.FormEvent) {
    event.preventDefault()
    setSavingSales(true)
    const failed: SaleRow[] = []
    for (const row of saleRows) {
      const response = await fetch('/api/store/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(row.productId),
          soldAt: row.soldAt,
          price: row.price,
          quantity: Number(row.quantity) || 1,
        }),
      })
      if (!response.ok) failed.push(row)
    }
    setSavingSales(false)
    queryClient.invalidateQueries({ queryKey: ['store-sales'] })

    if (failed.length > 0) {
      setSaleRows(failed)
      alert(t('salePartialSaveError', { failed: failed.length, total: saleRows.length }))
      return
    }
    setSaleModalOpen(false)
  }

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
          <Button onClick={openCreateProduct}>{t('newProduct')}</Button>
        </div>
        <Table<Product>
          rows={products ?? []}
          columns={[
            { key: 'name', label: tc('name'), render: (row) => row.name },
            { key: 'price', label: t('currentPrice'), render: (row) => fmt.rsd(Number(row.defaultPrice)) },
            { key: 'active', label: t('active'), render: (row) => (row.active ? tc('yes') : tc('no')) },
            {
              key: 'actions',
              label: '',
              render: (row) => (
                <Button variant="secondary" onClick={() => openEditProduct(row)}>
                  {tc('edit')}
                </Button>
              ),
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-md font-semibold text-heading">{t('sales')}</h2>
          <Button onClick={openSaleModal}>{t('newSale')}</Button>
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

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title={editingProduct ? t('editProductTitle') : t('newProductTitle')}>
        <form onSubmit={handleSaveProduct}>
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
          <p className="mb-3 text-sm text-muted">{t('priceIsCurrentOnly')}</p>
          {editingProduct && (
            <Field label={t('active')} htmlFor="productActive">
              <select
                id="productActive"
                value={productActive ? 'yes' : 'no'}
                onChange={(event) => setProductActive(event.target.value === 'yes')}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-fg"
              >
                <option value="yes">{tc('yes')}</option>
                <option value="no">{tc('no')}</option>
              </select>
            </Field>
          )}
          <Button type="submit" className="w-full">
            {tc('save')}
          </Button>
        </form>
      </Modal>

      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} title={t('newSaleTitle')} size="lg">
        <form onSubmit={handleCreateSales} className="flex flex-col gap-3">
          <div className="hidden gap-2 px-1 text-xs text-muted sm:grid sm:grid-cols-[1.6fr_1fr_1fr_0.7fr_auto]">
            <span>{t('product')}</span>
            <span>{tc('date')}</span>
            <span>{tc('priceRsd')}</span>
            <span>{tc('quantity')}</span>
            <span />
          </div>
          {saleRows.map((row, index) => (
            <div
              key={row.localId}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1.6fr_1fr_1fr_0.7fr_auto] sm:items-center"
            >
              <select
                aria-label={t('product')}
                value={row.productId}
                onChange={(event) => updateSaleRow(row.localId, { productId: Number(event.target.value) })}
                className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              >
                <option value="" disabled>
                  {t('chooseProduct')}
                </option>
                {(products ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label={tc('date')}
                value={row.soldAt}
                onChange={(event) => updateSaleRow(row.localId, { soldAt: event.target.value })}
                className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
              <input
                type="number"
                aria-label={tc('priceRsd')}
                value={row.price}
                onChange={(event) => updateSaleRow(row.localId, { price: event.target.value })}
                className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
              <input
                type="number"
                min="1"
                aria-label={tc('quantity')}
                value={row.quantity}
                onChange={(event) => updateSaleRow(row.localId, { quantity: event.target.value })}
                className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
                required
              />
              {index === saleRows.length - 1 ? (
                <Button type="button" onClick={addSaleRow} aria-label={t('addRow')}>
                  +
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeSaleRow(row.localId)}
                  aria-label={t('removeRow')}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button type="submit" className="mt-2 w-full" disabled={savingSales}>
            {savingSales ? tc('saving') : tc('save')}
          </Button>
        </form>
      </Modal>

    </div>
  )
}
