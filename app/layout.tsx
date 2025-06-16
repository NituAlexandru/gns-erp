import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { APP_DESCRIPTION, APP_NAME, APP_SLOGAN } from '@/lib/constants'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
// import ClientProviders from '@/components/shared/client-providers'
// import { Suspense } from 'react'
// import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: `${APP_NAME}. ${APP_SLOGAN}`,
  },
  description: APP_DESCRIPTION,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='ro' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div>{children}</div>
        {/* <ClientProviders>{children}</ClientProviders> */}
        <Analytics />
        <SpeedInsights />
        {/* <Suspense>
          <GoogleAnalytics />
        </Suspense> */}
      </body>
    </html>
  )
}
