'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/expenses/categorize'

export function ExpensesByCategoryChart({
  data,
}: {
  data: { category: ExpenseCategory; month: number; total: number }[]
}) {
  const totalsByCategory = new Map<ExpenseCategory, number>()
  for (const row of data) {
    totalsByCategory.set(row.category, (totalsByCategory.get(row.category) ?? 0) + row.total)
  }
  const chartData = Array.from(totalsByCategory.entries()).map(([category, total]) => ({
    category: EXPENSE_CATEGORY_LABELS[category],
    total,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="category" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Bar dataKey="total" fill="#f5f5f5" radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
