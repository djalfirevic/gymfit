'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '@/lib/chart-theme'
import { useFormat } from '@/lib/use-format'
import { useExpenseCategories } from '@/lib/use-expense-categories'

export function ExpensesByCategoryChart({
  data,
}: {
  data: { categoryId: number; slug: string | null; name: string; month: number; total: number }[]
}) {
  const theme = useChartTheme()
  const fmt = useFormat()
  const { label } = useExpenseCategories()
  // Grouped by id so two categories that happen to share a display name stay
  // separate bars.
  const totals = new Map<number, { label: string; total: number }>()
  for (const row of data) {
    const existing = totals.get(row.categoryId)
    totals.set(row.categoryId, {
      label: existing?.label ?? label(row),
      total: (existing?.total ?? 0) + row.total,
    })
  }
  const chartData = Array.from(totals.values()).map((entry) => ({ category: entry.label, total: entry.total }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="category" stroke={theme.axis} />
        <YAxis stroke={theme.axis} width={85} tickFormatter={(value: number) => fmt.number(value)} />
        <Tooltip
          contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
          labelStyle={{ color: theme.tooltipText }}
          formatter={(value: number) => fmt.number(value)}
        />
        <Bar dataKey="total" fill={theme.primary} radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
