import { describe, expect, it } from 'vitest'
import { convertRsdToEur, formatEur, formatRsd } from './currency'

describe('convertRsdToEur', () => {
  it('divides by the given rate', () => {
    expect(convertRsdToEur(1173, 117.3)).toBeCloseTo(10, 5)
  })

  it('throws on a non-positive rate', () => {
    expect(() => convertRsdToEur(1000, 0)).toThrow()
    expect(() => convertRsdToEur(1000, -5)).toThrow()
  })
})

describe('formatRsd', () => {
  it('includes the whole-number amount with no decimals', () => {
    const result = formatRsd(653900)
    expect(result).toContain('653')
    expect(result).toContain('900')
    expect(result).not.toContain('.00')
  })
})

describe('formatEur', () => {
  it('includes two decimal places', () => {
    const result = formatEur(172968.3761)
    expect(result).toContain('172')
    expect(result).toMatch(/38\b|37\b/)
  })
})
