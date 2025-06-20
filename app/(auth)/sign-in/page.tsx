import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import SeparatorWithOr from '@/components/shared/separator-or'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CredentialsSignInForm from './credentials-signin-form'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { GoogleSignInForm } from './google-signin-form'

export default async function SignIn(props: {
  searchParams: Promise<{
    callbackUrl: string
  }>
}) {
  const searchParams = await props.searchParams

  const { callbackUrl = '/' } = searchParams

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
          <div>
            <CredentialsSignInForm />
          </div>
          <SeparatorWithOr />
          <div className='mt-4'>
            <GoogleSignInForm />
          </div>
        </CardContent>
      </Card>
      <SeparatorWithOr>Ești nou pe {APP_NAME}?</SeparatorWithOr>

      <Link href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
        <Button className='w-full' variant='outline'>
          Creează-ți contul {APP_NAME}
        </Button>
      </Link>
    </div>
  )
}
