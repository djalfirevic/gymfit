'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
const YEAR_COLORS: Record<number, string> = { 2024: '#60a5fa', 2025: '#f87171', 2026: '#facc15' }

export function YearOverYearStackedChart({
  data,
}: {
  data: { year: number; rollup: { month: number; zarada: number }[] }[]
}) {
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
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Legend />
        {data.map((yearData) => (
          <Bar
            key={yearData.year}
            dataKey={String(yearData.year)}
            stackId="years"
            fill={YEAR_COLORS[yearData.year] ?? '#a3a3a3'}
            animationDuration={600}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
