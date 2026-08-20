'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { seriesColor, useChartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/currency'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']

export function ProductCountsChart({ data }: { data: { productName: string; soldAt: string; quantity: number }[] }) {
  const theme = useChartTheme()
  const productNames = [...new Set(data.map((row) => row.productName))]
  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    const row: Record<string, number | string> = { month: label }
    for (const productName of productNames) {
      row[productName] = data
        .filter((entry) => entry.productName === productName && new Date(entry.soldAt).getMonth() + 1 === month)
        .reduce((sum, entry) => sum + entry.quantity, 0)
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="month" stroke={theme.axis} />
        <YAxis stroke={theme.axis} width={85} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
          labelStyle={{ color: theme.tooltipText }}
          formatter={(value: number) => formatNumber(value)}
        />
        <Legend />
        {productNames.map((name, index) => (
          <Bar key={name} dataKey={name} stackId="products" fill={seriesColor(theme, index)} animationDuration={600} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
