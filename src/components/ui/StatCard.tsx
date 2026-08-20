export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="tabular mt-1.5 text-xl font-semibold tracking-tight text-heading">{value}</div>
      {hint && <div className="mt-1 text-sm text-muted">{hint}</div>}
    </div>
  )
}
