import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE, timingSafeEqual } from '@/lib/auth/session'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }
  const password =
    body && typeof body === 'object' && 'password' in body ? String((body as { password: unknown }).password) : ''

  const expected = process.env.APP_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'PASSWORD_NOT_CONFIGURED' }, { status: 500 })
  }
  if (!timingSafeEqual(password, expected)) {
    return NextResponse.json({ error: 'WRONG_PASSWORD' }, { status: 401 })
  }

  let token: string
  try {
    token = await createSessionToken()
  } catch {
    return NextResponse.json({ error: 'LOGIN_FAILED' }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
