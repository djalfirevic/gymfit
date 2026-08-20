'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']

export function MonthlyBarChart({
  data,
  color = '#60a5fa',
}: {
  data: { month: number; value: number }[]
  color?: string
}) {
  const chartData = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    return { month: label, value: data.find((entry) => entry.month === month)?.value ?? 0 }
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
