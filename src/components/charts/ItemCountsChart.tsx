'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber } from '@/lib/currency'

export function ItemCountsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="label" stroke="#a3a3a3" />
        <YAxis stroke="#a3a3a3" tickFormatter={formatNumber} />
        <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040' }} />
        <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}
