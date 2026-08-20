export function Table<T extends { id: number | string }>({
  columns,
  rows,
}: {
  columns: { key: string; label: string; render: (row: T) => React.ReactNode }[]
  rows: T[]
}) {
  return (
    <>
      {/* Wide screens get a real table. */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
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

      {/*
        On a phone a table forces sideways scrolling to reach the row actions,
        so each row becomes a labelled card instead. Columns with no header --
        the action buttons -- are laid out full width at the bottom rather than
        given an empty label.
      */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-card border border-line bg-surface p-3">
            <dl className="flex flex-col gap-1.5">
              {columns
                .filter((column) => column.label !== '')
                .map((column) => (
                  <div key={column.key} className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{column.label}</dt>
                    <dd className="text-right text-base">{column.render(row)}</dd>
                  </div>
                ))}
            </dl>
            {columns
              .filter((column) => column.label === '')
              .map((column) => (
                <div key={column.key} className="mt-3 border-t border-line pt-3">
                  {column.render(row)}
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  )
}
