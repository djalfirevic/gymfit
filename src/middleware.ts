import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session'

const PUBLIC_PATHS = new Set(['/login', '/api/auth/login'])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  let authenticated = false
  try {
    authenticated = await verifySessionToken(token)
  } catch {
    authenticated = false
  }
  if (authenticated) {
    return NextResponse.next()
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Static assets under public/ have to stay reachable while signed out --
  // the login page's own logo is one of them, and without this exclusion the
  // middleware answers the image request with a redirect to /login, so it
  // silently fails to render. public/ is for public files by definition; keep
  // anything sensitive out of it rather than relying on this gate.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$).*)',
  ],
}
