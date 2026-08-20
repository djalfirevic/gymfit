'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '@/lib/chart-theme'
import { useFormat } from '@/lib/use-format'
import { useTranslations } from 'next-intl'
import { type ExpenseCategory } from '@/lib/expenses/categorize'

export function ExpensesByCategoryChart({
  data,
}: {
  data: { category: ExpenseCategory; month: number; total: number }[]
}) {
  const theme = useChartTheme()
  const fmt = useFormat()
  const tc = useTranslations('categories')
  const totalsByCategory = new Map<ExpenseCategory, number>()
  for (const row of data) {
    totalsByCategory.set(row.category, (totalsByCategory.get(row.category) ?? 0) + row.total)
  }
  const chartData = Array.from(totalsByCategory.entries()).map(([category, total]) => ({
    category: tc(category),
    total,
  }))

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
