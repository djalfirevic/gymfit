export function Table<T extends { id: number | string }>({
  columns,
  rows,
}: {
  columns: { key: string; label: string; render: (row: T) => React.ReactNode }[]
  rows: T[]
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-left text-base">
        <thead className="border-b border-line bg-surface-2 text-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-2">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2.5">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
