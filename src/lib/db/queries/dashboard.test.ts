import { describe, expect, it } from 'vitest'
import { computeMonthRollup, computeYearlyEurTotals } from './dashboard'

describe('computeMonthRollup', () => {
  it('matches the spreadsheet formula: Stanje = Zarada - Troškovi, Podela = Stanje / 2', () => {
    const result = computeMonthRollup(653900, 19200)
    expect(result.stanje).toBe(634700)
    expect(result.podela).toBe(317350)
  })
})

describe('computeYearlyEurTotals', () => {
  it('sums Zarada (gross income) and Podela across months and converts to EUR at the given rate', () => {
    // Real January/February 2024 figures. Confirmed against the source
    // spreadsheet's own formula: SUM(Zarada column) / rate — NOT Stanje.
    const rows = [
      { zarada: 653900, podela: 317350 },
      { zarada: 677200, podela: 320596.5 },
    ]
    const rate = 117
    const result = computeYearlyEurTotals(rows, rate)
    expect(result.ukupnaZaradaEur).toBeCloseTo((653900 + 677200) / rate, 2)
    expect(result.zaradaEur).toBeCloseTo((317350 + 320596.5) / rate, 2)
  })
})
