// Rent is deliberately NOT a row in `expenses`. Putting it there would push it
// into the monthly Troškovi/Podela figures that get reconciled against the
// source spreadsheet, and it still would not move Ukupna zarada, which is
// gross. So it is applied to the yearly EUR totals only.
//
// The rent is 2300 EUR/month and has been paid every year the app reports on.
// Who paid it changed, and that is what `share` tracks:
//
//   2024-2025  one partner covered it alone, so it is a plain business cost:
//              it comes off the gross figure and leaves the other's split
//              untouched — share is 0.
//   2026 on    they pay half each, so half of it lands on that split too.
//
// This lives outside `queries/dashboard.ts` so the Excel export can share it:
// that module is `server-only`, and importing it into the workbook builder
// would break the workbook's tests.
export const MONTHLY_RENT_EUR = 2300
export const RENT_FROM_YEAR = 2024
export const RENT_SHARED_FROM_YEAR = 2026

export type AnnualRent = { total: number; share: number }

export function annualRentEur(year: number): AnnualRent {
  if (year < RENT_FROM_YEAR) {
    return { total: 0, share: 0 }
  }
  const total = MONTHLY_RENT_EUR * 12
  return { total, share: year < RENT_SHARED_FROM_YEAR ? 0 : total / 2 }
}
