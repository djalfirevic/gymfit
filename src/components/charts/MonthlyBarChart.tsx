'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/currency'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']

export function MonthlyBarChart({
  data,
  tone = 'primary',
}: {
  data: { month: number; value: number }[]
  tone?: 'primary' | 'danger'
}) {
  const theme = useChartTheme()
  const color = tone === 'danger' ? theme.danger : theme.primary
  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    return { month: label, value: data.find((entry) => entry.month === month)?.value ?? 0 }
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="month" stroke={theme.axis} />
        <YAxis stroke={theme.axis} width={85} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
          labelStyle={{ color: theme.tooltipText }}
          formatter={(value: number) => formatNumber(value)}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
