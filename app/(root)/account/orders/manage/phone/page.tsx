import { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { PhoneForm } from './profile-form'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

const PAGE_TITLE = 'Schimbă-ți numărul de telefon'
export const metadata: Metadata = { title: PAGE_TITLE }

export default async function PhonePage() {
  const session = await auth()
  if (!session) return null

  return (
    <div className='mb-24'>
      <SessionProvider session={session}>
        <div className='flex gap-2'>
          <Link href='/account'>Contul tău</Link>
          <span>›</span>
          <Link href='/account/manage'>Autentificare și Securitate</Link>
          <span>›</span>
          <span>{PAGE_TITLE}</span>
        </div>
        <h1 className='h1-bold py-4'>{PAGE_TITLE}</h1>
        <Card className='max-w-2xl'>
          <CardContent className='p-4'>
            <PhoneForm defaultPhone={session.user.phone || ''} />
          </CardContent>
        </Card>
      </SessionProvider>
    </div>
  )
}
