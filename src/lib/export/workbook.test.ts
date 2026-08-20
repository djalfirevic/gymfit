import { describe, expect, it } from 'vitest'
import { buildWorkbook, type ExportData } from './workbook'

const DATA: ExportData = {
  members: [
    { fullName: 'Ana Glušica', membershipRenewalDate: new Date(Date.UTC(2026, 8, 17)) },
    { fullName: 'Miloš Marković', membershipRenewalDate: new Date(Date.UTC(2026, 7, 1)) },
  ],
  payments: [{ memberNameRaw: 'Ana Glušica', paidAt: new Date(Date.UTC(2026, 7, 17)), amount: 4000 }],
  sales: [{ productName: 'Dnevni termin', soldAt: new Date(Date.UTC(2026, 7, 17)), price: 500 }],
  expenses: [
    { expenseDate: new Date(Date.UTC(2026, 7, 3)), description: 'Dnevnica', amount: 3000 },
  ],
  investedEur: 109000,
  years: [2024, 2025, 2026],
  rsdToEurRate: 117,
}

function formulaOf(workbook: ReturnType<typeof buildWorkbook>, sheet: string, cell: string): string {
  const value = workbook.getWorksheet(sheet)!.getCell(cell).value
  return (value as { formula: string }).formula
}

describe('buildWorkbook', () => {
  it('recreates every sheet of the source workbook', () => {
    const workbook = buildWorkbook(DATA)
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Members',
      'Payments',
      'Store',
      'Expenses',
      '2024',
      '2025',
      '2026',
      'Investments',
      'Print',
    ])
  })

  it('writes each data sheet with a header row plus one row per record', () => {
    const workbook = buildWorkbook(DATA)
    expect(workbook.getWorksheet('Members')!.getCell('A1').value).toBe('Ime i prezime')
    expect(workbook.getWorksheet('Members')!.getCell('A2').value).toBe('Ana Glušica')
    expect(workbook.getWorksheet('Members')!.rowCount).toBe(DATA.members.length + 1)
    expect(workbook.getWorksheet('Payments')!.getCell('A1').value).toBe('Član')
    expect(workbook.getWorksheet('Expenses')!.getCell('A1').value).toBe('Datum')
  })

  it('ends February on the real last day, in leap and non-leap years alike', () => {
    const workbook = buildWorkbook(DATA)
    // The source workbook wrote DATE(2025,2,29); Excel rolls that to 1 March and
    // silently pulled March transactions into February.
    expect(formulaOf(workbook, '2025', 'C3')).toContain('DATE(2025,2,28)')
    expect(formulaOf(workbook, '2025', 'D3')).toContain('DATE(2025,2,28)')
    expect(formulaOf(workbook, '2024', 'C3')).toContain('DATE(2024,2,29)')
    expect(formulaOf(workbook, '2024', 'D3')).toContain('DATE(2024,2,29)')
  })

  it('starts January in its own year', () => {
    // The source started 2024 January at DATE(2023,1,1), sweeping in all of 2023.
    const january = formulaOf(buildWorkbook(DATA), '2024', 'C2')
    expect(january).toContain('DATE(2024,1,1)')
    expect(january).not.toContain('DATE(2023')
  })

  it('counts members across the whole roster, not a fixed range', () => {
    const many = { ...DATA, members: Array.from({ length: 1523 }, () => DATA.members[0]) }
    expect(formulaOf(buildWorkbook(many), '2026', 'I2')).toBe('COUNT(Members!B2:B1524)')
  })

  it('quotes product names in the count formulas', () => {
    const workbook = buildWorkbook(DATA)
    const header = workbook.getWorksheet('2026')!.getCell('N1').value
    expect(header).toBe('Čokoladica')
    // Unquoted in the source, so Excel read it as a defined name and counted nothing.
    expect(formulaOf(workbook, '2026', 'N2')).toContain('"Čokoladica"')
  })

  it('derives the yearly EUR totals from the configured rate', () => {
    const workbook = buildWorkbook({ ...DATA, rsdToEurRate: 120 })
    expect(formulaOf(workbook, '2026', 'S3')).toBe('SUM(C2:C13) / 120')
    expect(formulaOf(workbook, '2026', 'S4')).toBe('SUM(F2:F13) / 120')
  })

  it('sums the investment totals across every exported year', () => {
    const workbook = buildWorkbook(DATA)
    expect(formulaOf(workbook, 'Investments', 'C3')).toBe("'2024'!S3 + '2025'!S3 + '2026'!S3")
    expect(workbook.getWorksheet('Investments')!.getCell('C2').value).toBe(109000)
  })

  it('keeps the Print sheet as a blank 35-row tally form', () => {
    const print = buildWorkbook(DATA).getWorksheet('Print')!
    expect(print.getCell('B4').value).toBe('RB')
    expect(print.getCell('B5').value).toBe(1)
    expect(print.getCell('B39').value).toBe(35)
    expect(print.getCell('C41').value).toBe('Termin')
  })
})
