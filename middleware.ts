import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const publicPages = ['/', '/sign-in', '/sign-up']

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl

  // 1) Dacă e publică, lasă să continue:
  if (publicPages.some((p) => new RegExp(`^${p}$`, 'i').test(pathname))) {
    return NextResponse.next()
  }

  // 2) Alege numele cookie-ului corect:
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token' // sau '__Host-authjs.session-token' dacă cookie-ul se numește așa
      : 'authjs.session-token'

  // 3) Încearcă să iei JWT-ul din cookie:
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName,
  })

  // 4) Dacă nu există token => redirect la sign-in:
  if (!token) {
    const callback = encodeURIComponent(pathname || '/')
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${callback}`, origin)
    )
  }

  // 5) Extrage rolul și verifică /admin:
  const userRole = ((token.role as string) || '').trim().toLowerCase()
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL(`/`, origin))
  }

  // 6) Totul e OK:
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
