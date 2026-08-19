import { describe, expect, it } from 'vitest'
import { memberStatus } from './members'

describe('memberStatus', () => {
  it('is active when the renewal date is today or later', () => {
    const today = new Date('2026-08-19')
    expect(memberStatus(new Date('2026-08-19'), today)).toBe('active')
    expect(memberStatus(new Date('2026-08-20'), today)).toBe('active')
  })

  it('is not_renewed when the renewal date is in the past', () => {
    const today = new Date('2026-08-19')
    expect(memberStatus(new Date('2026-08-18'), today)).toBe('not_renewed')
    expect(memberStatus(new Date('2024-01-01'), today)).toBe('not_renewed')
  })
})
