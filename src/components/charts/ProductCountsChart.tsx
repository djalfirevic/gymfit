'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
const COLORS = ['#60a5fa', '#f87171', '#facc15', '#4ade80', '#a78bfa', '#fb923c']

export function ProductCountsChart({ data }: { data: { productName: string; soldAt: string; quantity: number }[] }) {
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
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Legend />
        {productNames.map((name, index) => (
          <Bar key={name} dataKey={name} stackId="products" fill={COLORS[index % COLORS.length]} animationDuration={600} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
