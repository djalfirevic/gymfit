// Rent is deliberately NOT a row in `expenses`. Putting it there would push it
// into the monthly Troškovi/Podela figures that get reconciled against the
// source spreadsheet, and it still would not move Ukupna zarada, which is
// gross. So it is applied to the yearly EUR totals only.
//
// The rent is 2300 EUR/month and the two partners split it down the middle, so
// one share is 1150/month — 13800 over a year. Rent started in 2026; 2024 and
// 2025 had none and must keep reporting none.
//
// This lives outside `queries/dashboard.ts` so the Excel export can share it:
// that module is `server-only`, and importing it into the workbook builder
// would break the workbook's tests.
export const MONTHLY_RENT_EUR = 2300
export const RENT_FROM_YEAR = 2026

export type AnnualRent = { total: number; share: number }

export function annualRentEur(year: number): AnnualRent {
  if (year < RENT_FROM_YEAR) {
    return { total: 0, share: 0 }
  }
  const total = MONTHLY_RENT_EUR * 12
  return { total, share: total / 2 }
}
