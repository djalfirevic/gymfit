import { beforeEach, describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from './session'

describe('session tokens', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'a'.repeat(32)
  })

  it('verifies a freshly created token', async () => {
    const token = await createSessionToken()
    expect(await verifySessionToken(token)).toBe(true)
  })

  it('rejects a tampered token', async () => {
    const token = await createSessionToken()
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(await verifySessionToken(tampered)).toBe(false)
  })

  it('rejects an expired token', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    const token = await createSessionToken(thirtyOneDaysAgo)
    expect(await verifySessionToken(token)).toBe(false)
  })

  it('rejects a missing token', async () => {
    expect(await verifySessionToken(null)).toBe(false)
    expect(await verifySessionToken(undefined)).toBe(false)
  })

  it('rejects a malformed token', async () => {
    expect(await verifySessionToken('not-a-token')).toBe(false)
  })
})
