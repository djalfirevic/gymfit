import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session'

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string }
  const expected = process.env.APP_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'APP_PASSWORD nije podešen na serveru' }, { status: 500 })
  }
  if (body.password !== expected) {
    return NextResponse.json({ error: 'Pogrešna lozinka' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}
