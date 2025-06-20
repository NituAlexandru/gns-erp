// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rute care oricum trebuie accesibile fără login:
const publicPages = ['/sign-in', '/sign-up']

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl

  // 0) Permit toate asset-urile statice (logo, imagini, CSS/JS, _next etc)
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    // extensii comune: svg/png/jpg/css/js și sourcemap
    pathname.match(/\.(svg|png|jpe?g|css|js|map)$/)
  ) {
    return NextResponse.next()
  }

  // 1) Dacă e o pagină publică, lasă să continue:
  if (publicPages.includes(pathname)) {
    return NextResponse.next()
  }

  // 2) Alege numele cookie-ului de sesiune:
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'

  // 3) Încearcă să citești JWT-ul:
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName,
  })

  // 4) Dacă nu e autentificat, redirect la login (păstrăm callbackUrl):
  if (!token) {
    const callback = encodeURIComponent(pathname)
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${callback}`, origin)
    )
  }

  // 5) Protejare /admin doar pentru rolul admin:
  const userRole = ((token.role as string) || '').toLowerCase()
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL(`/`, origin))
  }

  // 6) Totul OK → continuă:
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
