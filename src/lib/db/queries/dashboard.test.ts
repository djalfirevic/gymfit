import { describe, expect, it } from 'vitest'
import { computeMonthRollup, computeYearlyEurTotals } from './dashboard'
import { annualRentEur } from '@/lib/rent'

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

  it('subtracts rent proportionally: the whole rent off gross, one half off the split', () => {
    const rows = [{ zarada: 1000000, podela: 400000 }]
    const rate = 100
    const result = computeYearlyEurTotals(rows, rate, { total: 27600, share: 13800 })
    expect(result.ukupnaZaradaEur).toBeCloseTo(10000 - 27600, 2)
    expect(result.zaradaEur).toBeCloseTo(4000 - 13800, 2)
    expect(result.kirijaEur).toBe(27600)
    expect(result.kirijaShareEur).toBe(13800)
  })

  it('reports no rent when none is passed, so years before it started are unchanged', () => {
    const rows = [{ zarada: 1000000, podela: 400000 }]
    const result = computeYearlyEurTotals(rows, 100)
    expect(result.ukupnaZaradaEur).toBeCloseTo(10000, 2)
    expect(result.zaradaEur).toBeCloseTo(4000, 2)
    expect(result.kirijaEur).toBe(0)
  })
})

describe('annualRentEur', () => {
  it('charges nothing before the rent started', () => {
    expect(annualRentEur(2024)).toEqual({ total: 0, share: 0 })
    expect(annualRentEur(2025)).toEqual({ total: 0, share: 0 })
  })

  it('charges 12 months from 2026 onward — 1150/month per partner, twice that in total', () => {
    expect(annualRentEur(2026)).toEqual({ total: 27600, share: 13800 })
    expect(annualRentEur(2027)).toEqual({ total: 27600, share: 13800 })
  })
})
