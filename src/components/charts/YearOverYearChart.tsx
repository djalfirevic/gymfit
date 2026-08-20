'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber } from '@/lib/currency'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
const YEAR_COLORS: Record<number, string> = { 2024: '#60a5fa', 2025: '#f87171', 2026: '#facc15' }

type RollupEntry = { month: number; zarada: number; stanje: number; podela: number }

export function YearOverYearChart({
  data,
  valueKey = 'zarada',
}: {
  data: { year: number; rollup: RollupEntry[] }[]
  valueKey?: 'zarada' | 'stanje' | 'podela'
}) {
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
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" width={72} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{ background: '#171717', border: '1px solid #404040' }}
          formatter={(value: number) => formatNumber(value)}
        />
        {data.map((yearData) => (
          <Line
            key={yearData.year}
            type="monotone"
            dataKey={String(yearData.year)}
            stroke={YEAR_COLORS[yearData.year] ?? '#a3a3a3'}
            strokeWidth={2}
            dot={false}
            animationDuration={600}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
