'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { seriesColor, useChartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/currency'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']

export function YearOverYearStackedChart({
  data,
}: {
  data: { year: number; rollup: { month: number; zarada: number }[] }[]
}) {
  const theme = useChartTheme()

  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    const row: Record<string, number | string> = { month: label }
    for (const yearData of data) {
      row[String(yearData.year)] = yearData.rollup.find((entry) => entry.month === month)?.zarada ?? 0
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={320}>
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
        {data.map((yearData, index) => (
          <Bar
            key={yearData.year}
            dataKey={String(yearData.year)}
            stackId="years"
            fill={seriesColor(theme, index)}
            animationDuration={600}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
