import { describe, expect, it } from 'vitest'
import { matchMemberIdByName, normalizeName } from './match-member'

const roster = [
  { id: 1, fullName: 'Aleksandar Mažić' },
  { id: 2, fullName: 'Uroš Korać' },
]

describe('normalizeName', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeName('  Aleksandar   Mažić ')).toBe('aleksandar mažić')
  })
})

describe('matchMemberIdByName', () => {
  it('matches on exact name', () => {
    expect(matchMemberIdByName('Aleksandar Mažić', roster)).toBe(1)
  })

  it('matches case- and whitespace-insensitively', () => {
    expect(matchMemberIdByName('  uroš korać', roster)).toBe(2)
  })

  it('returns null when no member matches', () => {
    expect(matchMemberIdByName('Nepostojeći Član', roster)).toBeNull()
  })
})
