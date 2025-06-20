'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { SignInWithGoogle } from '@/lib/actions/user.actions'
import { Loader2 } from 'lucide-react'

export function GoogleSignInForm() {
  const SignInButton = () => {
    const { pending } = useFormStatus()
    return (
      <Button disabled={pending} className='w-full' variant='outline'>
        {pending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Se redirecționează...
          </>
        ) : (
          'Continuă cu Google'
        )}
      </Button>
    )
  }
  return (
    <form action={SignInWithGoogle}>
      <SignInButton />
    </form>
  )
}
