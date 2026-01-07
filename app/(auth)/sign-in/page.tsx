import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import SeparatorWithOr from '@/components/shared/separator-or'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CredentialsSignInForm from './credentials-signin-form'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { GoogleSignInForm } from './google-signin-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default async function SignIn(props: {
  searchParams: Promise<{
    callbackUrl: string
    error: string
  }>
}) {
  const searchParams = await props.searchParams

  const { callbackUrl = '/', error } = searchParams

  const session = await auth()
  if (session) {
    return redirect(callbackUrl)
  }

  return (
    <div className='w-full'>
      <Card>
        <CardHeader>
          <CardTitle className='text-2xl'>Autentifică-te</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Afișăm notificarea de eroare dacă accesul a fost negat */}
          {error === 'AccessDenied' && (
            <Alert variant='destructive' className='mb-4'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                Nu aveți un cont creat în sistem. Vă rugăm să contactați un
                administrator pentru a vă configura accesul.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <CredentialsSignInForm />
          </div>
          <SeparatorWithOr />
          <div className='mt-4'>
            <GoogleSignInForm />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
