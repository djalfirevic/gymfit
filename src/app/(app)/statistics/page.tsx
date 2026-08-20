'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ItemCountsChart } from '@/components/charts/ItemCountsChart'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { formatEur, formatRsd } from '@/lib/currency'

type DashboardResponse = {
  year: number
  memberCounts: { active: number; notRenewed: number; total: number }
  rollup: { month: number; zarada: number; troskovi: number; stanje: number; podela: number }[]
  yearlyTotals: { ukupnaZaradaEur: number; zaradaEur: number }
}

type Product = { id: number; name: string }
type Sale = { id: number; productId: number; soldAt: string }
type Expense = { id: number; expenseDate: string; description: string }

const ITEM_PRODUCT_NAMES = ['Kolagen', 'Nocco', 'Čokoladica', 'Pre-workout']

async function fetchDashboard(year: number): Promise<DashboardResponse> {
  const response = await fetch(`/api/dashboard?year=${year}`)
  if (!response.ok) throw new Error('Failed to load dashboard')
  return response.json()
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

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch('/api/expenses')
  if (!response.ok) throw new Error('Failed to load expenses')
  return response.json()
}

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Jun',
  'Jul',
  'Avgust',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
]

export default function StatisticsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, index) => 2024 + index).reverse()

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', year],
    queryFn: () => fetchDashboard(year),
  })
  const { data: products, isLoading: productsLoading } = useQuery({ queryKey: ['store-products'], queryFn: fetchProducts })
  const { data: sales, isLoading: salesLoading } = useQuery({ queryKey: ['store-sales'], queryFn: fetchSales })
  const { data: expenses, isLoading: expensesLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })

  if (dashboardLoading || productsLoading || salesLoading || expensesLoading) {
    return <p className="text-muted">Učitavanje...</p>
  }
  if (!dashboard || !products || !sales || !expenses) {
    return <p className="text-muted">Greška pri učitavanju podataka.</p>
  }

  const productById = new Map(products.map((product) => [product.id, product]))
  const salesThisYear = sales.filter((sale) => new Date(sale.soldAt).getFullYear() === year)
  const countByProduct = new Map<string, number>()
  for (const sale of salesThisYear) {
    const name = productById.get(sale.productId)?.name
    if (!name) continue
    countByProduct.set(name, (countByProduct.get(name) ?? 0) + 1)
  }

  const expensesThisYear = expenses.filter((expense) => new Date(expense.expenseDate).getFullYear() === year)
  const dnevnicaCount = expensesThisYear.filter((expense) =>
    expense.description.toLowerCase().includes('dnevnic'),
  ).length
  const ciscenjeCount = expensesThisYear.filter((expense) =>
    expense.description.toLowerCase().includes('čišćenje') || expense.description.toLowerCase().includes('ciscenje'),
  ).length

  const itemCountsData = ITEM_PRODUCT_NAMES.map((name) => ({ label: name, count: countByProduct.get(name) ?? 0 }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-heading">Statistika</h1>
        <select
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="rounded-card border border-line bg-surface px-3 py-2 text-fg"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="mb-4 text-md font-semibold text-heading">Zarada po mesecima ({year})</h2>
          <Table<{ id: number; month: string; zarada: string; troskovi: string; stanje: string; podela: string }>
            rows={dashboard.rollup.map((row) => ({
              id: row.month,
              month: MONTH_NAMES[row.month - 1],
              zarada: formatRsd(row.zarada),
              troskovi: formatRsd(row.troskovi),
              stanje: formatRsd(row.stanje),
              podela: formatRsd(row.podela),
            }))}
            columns={[
              { key: 'month', label: '', render: (row) => row.month },
              { key: 'zarada', label: 'Zarada', render: (row) => row.zarada },
              { key: 'troskovi', label: 'Troškovi', render: (row) => row.troskovi },
              { key: 'stanje', label: 'Stanje', render: (row) => row.stanje },
              { key: 'podela', label: 'Podela', render: (row) => row.podela },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 content-start md:grid-cols-4">
          <StatCard label="Članova" value={String(dashboard.memberCounts.total)} />
          <StatCard label="Neobnovljene" value={String(dashboard.memberCounts.notRenewed)} />
          <StatCard label="Aktivni" value={String(dashboard.memberCounts.active)} />
          <StatCard label="Dnevni termin" value={String(countByProduct.get('Dnevni termin') ?? 0)} />
          <StatCard label="Kolagen" value={String(countByProduct.get('Kolagen') ?? 0)} />
          <StatCard label="Nocco" value={String(countByProduct.get('Nocco') ?? 0)} />
          <StatCard label="Čokoladica" value={String(countByProduct.get('Čokoladica') ?? 0)} />
          <StatCard label="Pre-workout" value={String(countByProduct.get('Pre-workout') ?? 0)} />
          <StatCard label="Dnevnica" value={String(dnevnicaCount)} />
          <StatCard label="Čišćenje" value={String(ciscenjeCount)} />
          <StatCard label={`Ukupna zarada (${year})`} value={formatEur(dashboard.yearlyTotals.ukupnaZaradaEur)} />
          <StatCard label={`Zarada (${year})`} value={formatEur(dashboard.yearlyTotals.zaradaEur)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="mb-4 text-md font-semibold text-heading">Zarada po mesecima</h2>
          <MonthlyBarChart data={dashboard.rollup.map((row) => ({ month: row.month, value: row.zarada }))} tone="primary" />
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <h2 className="mb-4 text-md font-semibold text-heading">Troškovi po mesecima</h2>
          <MonthlyBarChart
            data={dashboard.rollup.map((row) => ({ month: row.month, value: row.troskovi }))}
            tone="danger"
          />
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-4 text-md font-semibold text-heading">Stavke</h2>
        <ItemCountsChart data={itemCountsData} />
      </div>
    </div>
  )
}
