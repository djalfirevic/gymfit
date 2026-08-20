import ExcelJS from 'exceljs'

export type ExportData = {
  members: { fullName: string; membershipRenewalDate: Date }[]
  payments: { memberNameRaw: string; paidAt: Date; amount: number }[]
  sales: { productName: string; soldAt: Date; price: number }[]
  expenses: { expenseDate: Date; description: string; amount: number }[]
  investedEur: number
  years: number[]
  rsdToEurRate: number
}

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Jun',
  'Jul',
  'Avgust',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
]

// Counted per year on each year sheet, matching the source workbook's layout.
const COUNTED_PRODUCTS = ['Kolagen', 'Nocco', 'Čokoladica', 'Pre-workout', 'Dnevni termin']

const DATE_FORMAT = 'dd.mm.yyyy'
const MONEY_FORMAT = '#,##0'

/** Last calendar day of a month -- the source workbook hardcoded these and got
 *  February wrong in three separate places. */
function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function excelDate(year: number, month: number, day: number): string {
  return `DATE(${year},${month},${day})`
}

export function buildWorkbook(data: ExportData): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GymFit'
  workbook.created = new Date()

  // ---- Members -----------------------------------------------------------
  const members = workbook.addWorksheet('Members')
  members.columns = [
    { header: 'Ime i prezime', key: 'name', width: 19.4 },
    { header: 'Obnova članarine', key: 'renewal', width: 14 },
  ]
  for (const member of data.members) {
    members.addRow({ name: member.fullName, renewal: member.membershipRenewalDate })
  }
  members.getColumn('renewal').numFmt = DATE_FORMAT
  const memberRowCount = data.members.length

  // ---- Payments ----------------------------------------------------------
  const payments = workbook.addWorksheet('Payments')
  payments.columns = [
    { header: 'Član', key: 'member', width: 21.9 },
    { header: 'Datum', key: 'date', width: 8.6 },
    { header: 'Cena', key: 'price', width: 7.6 },
  ]
  for (const payment of data.payments) {
    payments.addRow({ member: payment.memberNameRaw, date: payment.paidAt, price: payment.amount })
  }
  payments.getColumn('date').numFmt = DATE_FORMAT
  payments.getColumn('price').numFmt = MONEY_FORMAT

  // ---- Store -------------------------------------------------------------
  const store = workbook.addWorksheet('Store')
  store.columns = [
    { header: 'Proizvod', key: 'product', width: 11.2 },
    { header: 'Datum', key: 'date', width: 8.6 },
    { header: 'Cena', key: 'price', width: 7.6 },
  ]
  for (const sale of data.sales) {
    store.addRow({ product: sale.productName, date: sale.soldAt, price: sale.price })
  }
  store.getColumn('date').numFmt = DATE_FORMAT
  store.getColumn('price').numFmt = MONEY_FORMAT

  // ---- Expenses ----------------------------------------------------------
  const expenses = workbook.addWorksheet('Expenses')
  expenses.columns = [
    { header: 'Datum', key: 'date', width: 7.5 },
    { header: 'Naziv', key: 'name', width: 29.1 },
    { header: 'Cena', key: 'price', width: 7.6 },
  ]
  for (const expense of data.expenses) {
    expenses.addRow({ date: expense.expenseDate, name: expense.description, price: expense.amount })
  }
  expenses.getColumn('date').numFmt = DATE_FORMAT
  expenses.getColumn('price').numFmt = MONEY_FORMAT

  // ---- One sheet per year ------------------------------------------------
  for (const year of data.years) {
    addYearSheet(workbook, year, memberRowCount, data.rsdToEurRate)
  }

  // ---- Investments -------------------------------------------------------
  const investments = workbook.addWorksheet('Investments')
  investments.getColumn('A').width = 12.8
  investments.getColumn('C').width = 10.2
  investments.getCell('B2').value = 'Uloženo:'
  investments.getCell('C2').value = data.investedEur
  investments.getCell('B3').value = 'Ukupna zarada:'
  investments.getCell('C3').value = {
    formula: data.years.map((year) => `'${year}'!S3`).join(' + '),
  }
  investments.getCell('B4').value = 'Zarada:'
  investments.getCell('C4').value = {
    formula: data.years.map((year) => `'${year}'!S4`).join(' + '),
  }
  for (const cell of ['C2', 'C3', 'C4']) {
    investments.getCell(cell).numFmt = '#,##0.00'
  }

  addPrintSheet(workbook)

  return workbook
}

function addYearSheet(
  workbook: ExcelJS.Workbook,
  year: number,
  memberRowCount: number,
  rate: number,
): void {
  const sheet = workbook.addWorksheet(String(year))

  const widths: Record<string, number> = {
    B: 9.1, C: 9.4, I: 8, J: 11.2, K: 7.1, L: 8, M: 5.8, N: 9.2, O: 10, P: 11.2, R: 12.8, S: 10.2,
  }
  for (const [column, width] of Object.entries(widths)) {
    sheet.getColumn(column).width = width
  }

  sheet.getCell('C1').value = 'Zarada'
  sheet.getCell('D1').value = 'Troškovi'
  sheet.getCell('E1').value = 'Stanje'
  sheet.getCell('F1').value = 'Podela'

  for (let month = 1; month <= 12; month += 1) {
    const row = month + 1
    const from = excelDate(year, month, 1)
    // The source workbook hardcoded month ends and got February wrong three
    // times over (2/29 in non-leap 2025 and 2026 silently rolls into March).
    const to = excelDate(year, month, lastDay(year, month))

    sheet.getCell(`B${row}`).value = MONTH_NAMES[month - 1]
    sheet.getCell(`C${row}`).value = {
      formula:
        `SUMIFS(Payments!C:C, Payments!B:B, ">="&${from}, Payments!B:B, "<="&${to})` +
        ` + SUMIFS(Store!C:C, Store!B:B, ">="&${from}, Store!B:B, "<="&${to})`,
    }
    sheet.getCell(`D${row}`).value = {
      formula: `SUMIFS(Expenses!C:C, Expenses!A:A, ">="&${from}, Expenses!A:A, "<="&${to})`,
    }
    sheet.getCell(`E${row}`).value = { formula: `C${row}-D${row}` }
    sheet.getCell(`F${row}`).value = { formula: `E${row}/2` }

    for (const column of ['C', 'D', 'E', 'F']) {
      sheet.getCell(`${column}${row}`).numFmt = MONEY_FORMAT
    }
  }

  // Member counts. The source capped its range at row 997 while the roster had
  // grown past 1500, so "Članova" silently undercounted by a third.
  const lastMemberRow = memberRowCount + 1
  sheet.getCell('I1').value = 'Članova'
  sheet.getCell('J1').value = 'Neobnovljene'
  sheet.getCell('K1').value = 'Aktivni'
  sheet.getCell('I2').value = { formula: `COUNT(Members!B2:B${lastMemberRow})` }
  sheet.getCell('J2').value = { formula: `COUNTIF(Members!B2:B${lastMemberRow}, "<" & TODAY())` }
  sheet.getCell('K2').value = { formula: 'I2-J2' }

  // Per-product counts for the year. "Čokoladica" was unquoted in the source,
  // which made Excel read it as a defined name and count nothing.
  const yearStart = excelDate(year, 1, 1)
  const yearEnd = excelDate(year, 12, 31)
  COUNTED_PRODUCTS.forEach((product, index) => {
    const column = String.fromCharCode('L'.charCodeAt(0) + index)
    sheet.getCell(`${column}1`).value = product
    sheet.getCell(`${column}2`).value = {
      formula: `COUNTIFS(Store!A:A, "${product}", Store!B:B, ">="&${yearStart}, Store!B:B, "<="&${yearEnd})`,
    }
  })

  sheet.getCell('I5').value = 'Dnevnica'
  sheet.getCell('J5').value = 'Čišćenje'
  sheet.getCell('I6').value = {
    formula: `COUNTIFS(Expenses!B:B, "Dnevnica", Expenses!A:A, ">="&${yearStart}, Expenses!A:A, "<="&${yearEnd})`,
  }
  sheet.getCell('J6').value = {
    formula: `COUNTIFS(Expenses!B:B, "Čišćenje", Expenses!A:A, ">="&${yearStart}, Expenses!A:A, "<="&${yearEnd})`,
  }

  sheet.getCell('R3').value = 'Ukupna zarada:'
  sheet.getCell('S3').value = { formula: `SUM(C2:C13) / ${rate}` }
  sheet.getCell('R4').value = 'Zarada:'
  sheet.getCell('S4').value = { formula: `SUM(F2:F13) / ${rate}` }
  sheet.getCell('S3').numFmt = '#,##0.00'
  sheet.getCell('S4').numFmt = '#,##0.00'
}

/** The blank tally form kept for printing -- paper, not data, so it is
 *  reproduced as an empty template exactly like the original. */
function addPrintSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Print')
  const widths: Record<string, number> = {
    B: 3.4, C: 20, D: 9.1, E: 9.4, F: 8, G: 3.6, H: 3.5, I: 5.1, J: 13.6, K: 15.8,
  }
  for (const [column, width] of Object.entries(widths)) {
    sheet.getColumn(column).width = width
  }

  sheet.getCell('C2').value = 'Datum: '
  const headers: Record<string, string> = {
    B4: 'RB', C4: 'Ime i prezime', F4: 'Iznos', G4: 'CM', H4: 'PM', I4: 'Dug?',
    J4: 'Važi do', K4: 'Napomena',
  }
  for (const [cell, value] of Object.entries(headers)) {
    sheet.getCell(cell).value = value
    sheet.getCell(cell).font = { bold: true }
  }

  for (let index = 1; index <= 35; index += 1) {
    sheet.getCell(`B${index + 4}`).value = index
  }

  const tally: [string, string, string][] = [
    ['C41', 'Termin', 'O O O O O O O O O O '],
    ['C42', 'Pre-workout', 'O O O O O O O O O O '],
    ['C43', 'Kolagen', 'O O O O O O O O O O '],
    ['C44', 'Whey', 'O O O O O O O O O O '],
    ['C45', 'Čokoladica', 'O O O O O O O O O O '],
    ['C46', 'Čišćenje', 'O'],
    ['C47', 'Dnevnica', 'O O O'],
  ]
  for (const [cell, label, marks] of tally) {
    sheet.getCell(cell).value = label
    sheet.getCell(cell.replace('C', 'D')).value = marks
  }
  sheet.getCell('C49').value = 'Troškovi'
  sheet.getCell('J41').value = 'CM'
  sheet.getCell('J42').value = 'PM'
  sheet.getCell('I46').value = 'UKUPNO'
  sheet.getCell('I47').value = 'TROŠKOVI'
  sheet.getCell('I48').value = 'PODELA'
}
