import { describe, expect, it } from 'vitest'
import { categorizeExpense } from './categorize'

describe('categorizeExpense', () => {
  it('categorizes payroll/per-diem entries', () => {
    expect(categorizeExpense('Dnevnica - Aleksandra')).toBe('zarade_bonusi')
    expect(categorizeExpense('Bonus Andrej')).toBe('zarade_bonusi')
    expect(categorizeExpense('Dmevnice')).toBe('zarade_bonusi')
  })

  it('categorizes utility bills', () => {
    expect(categorizeExpense('Gradska čistoća - avgust 2025')).toBe('rezije')
    expect(categorizeExpense('Internet')).toBe('rezije')
    expect(categorizeExpense('mts: april')).toBe('rezije')
  })

  it('categorizes supply restocks', () => {
    expect(categorizeExpense('Kolagen (2 kutije)')).toBe('zalihe')
    expect(categorizeExpense('Članske karte 500 kom')).toBe('zalihe')
    expect(categorizeExpense('Čokoladice')).toBe('zalihe')
  })

  it('categorizes cleaning/maintenance', () => {
    expect(categorizeExpense('Čišćenje')).toBe('odrzavanje')
    expect(categorizeExpense('Zapušenje WC šolje')).toBe('odrzavanje')
    expect(categorizeExpense('Dezinsekcija i deratizacija')).toBe('odrzavanje')
  })

  it('falls back to Ostalo for anything unmatched', () => {
    expect(categorizeExpense('Baterije za vagu')).toBe('ostalo')
  })

  it('is case-insensitive', () => {
    expect(categorizeExpense('KOLAGEN')).toBe('zalihe')
  })
})
