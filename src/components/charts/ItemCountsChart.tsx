'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/currency'

export function ItemCountsChart({ data }: { data: { label: string; count: number }[] }) {
  const theme = useChartTheme()

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="label" stroke={theme.axis} />
        <YAxis stroke={theme.axis} width={85} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
          labelStyle={{ color: theme.tooltipText }}
          formatter={(value: number) => formatNumber(value)}
        />
        <Bar dataKey="count" fill={theme.primary} radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
