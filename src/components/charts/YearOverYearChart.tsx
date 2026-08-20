'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { seriesColor, useChartTheme } from '@/lib/chart-theme'
import { formatNumber } from '@/lib/currency'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']

type RollupEntry = { month: number; zarada: number; stanje: number; podela: number }

export function YearOverYearChart({
  data,
  valueKey = 'zarada',
}: {
  data: { year: number; rollup: RollupEntry[] }[]
  valueKey?: 'zarada' | 'stanje' | 'podela'
}) {
  const theme = useChartTheme()

  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    const row: Record<string, number | string> = { month: label }
    for (const yearData of data) {
      row[String(yearData.year)] = yearData.rollup.find((entry) => entry.month === month)?.[valueKey] ?? 0
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey="month" stroke={theme.axis} />
        <YAxis stroke={theme.axis} width={85} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}` }}
          labelStyle={{ color: theme.tooltipText }}
          formatter={(value: number) => formatNumber(value)}
        />
        {data.map((yearData, index) => (
          <Line
            key={yearData.year}
            type="monotone"
            dataKey={String(yearData.year)}
            stroke={seriesColor(theme, index)}
            strokeWidth={2}
            dot={false}
            animationDuration={600}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
