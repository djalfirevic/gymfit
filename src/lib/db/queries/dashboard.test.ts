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
  it('sums Stanje and Podela across months and converts to EUR at the given rate', () => {
    const rows = [
      { stanje: 634700, podela: 317350 },
      { stanje: 641193, podela: 320596.5 },
    ]
    const rate = 117.3283
    const result = computeYearlyEurTotals(rows, rate)
    expect(result.ukupnaZaradaEur).toBeCloseTo((634700 + 641193) / rate, 2)
    expect(result.zaradaEur).toBeCloseTo((317350 + 320596.5) / rate, 2)
  })
})
