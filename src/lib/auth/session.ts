export const SESSION_COOKIE_NAME = 'gymfit_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, in seconds

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return secret
}

async function importKey(): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(getSecret())
  return crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createSessionToken(issuedAtMs: number = Date.now()): Promise<string> {
  const payload = `session.${issuedAtMs}`
  const key = await importKey()
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${toBase64Url(signatureBytes)}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [marker, issuedAtRaw] = parts
  if (marker !== 'session') return false
  const issuedAtMs = Number(issuedAtRaw)
  if (!Number.isFinite(issuedAtMs)) return false
  const ageSeconds = (Date.now() - issuedAtMs) / 1000
  if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE) return false
  const expected = await createSessionToken(issuedAtMs)
  return expected === token
}
