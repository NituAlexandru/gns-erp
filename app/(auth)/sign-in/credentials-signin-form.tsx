'use client'

import { redirect, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { signInWithCredentials } from '@/lib/db/modules/user/user.actions'
import { zodResolver } from '@hookform/resolvers/zod'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { APP_NAME } from '@/lib/constants'
import { toast } from 'sonner'
import { UserSignInSchema } from '@/lib/db/modules/user/validator'
import { IUserSignIn } from '@/lib/db/modules/user/types'
import { useState, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const signInDefaultValues =
  process.env.NODE_ENV === 'development'
    ? {
        email: 'admin@example.com',
        password: '12345',
      }
    : {
        email: '',
        password: '',
      }

export default function CredentialsSignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<IUserSignIn>({
    resolver: zodResolver(UserSignInSchema),
    defaultValues: signInDefaultValues,
  })

  const { control, handleSubmit } = form

  const onSubmit = async (data: IUserSignIn) => {
    // Folosim startTransition pentru a gestiona starea de pending
    startTransition(async () => {
      try {
        const result = await signInWithCredentials({
          email: data.email,
          password: data.password,
        })

        // Dacă avem eroare explicită de la Auth.js
        if (result?.error) {
          if (result.error === 'CredentialsSignin') {
            toast.error('Email sau parolă incorecte')
          } else {
            toast.error(result.error)
          }
          return // Oprim execuția aici dacă e eroare
        }

        // ✅ 5. FIXUL CRITIC: Dacă nu e eroare, înseamnă că e succes!
        // Facem redirect manual din client.
        toast.success('Autentificare reușită!')
        router.refresh() // Actualizează sesiunea în componentele server
        router.push(callbackUrl) // Te trimite pe pagina dorită
      } catch (error) {
        console.error(error)
        toast.error('Ceva nu a mers bine', {
          description: 'Vă rugăm să încercați din nou.',
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input type='hidden' name='callbackUrl' value={callbackUrl} />
        <div className='space-y-6'>
          <FormField
            control={control}
            name='email'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    suppressHydrationWarning
                    placeholder='Introduceți adresa de email'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name='password'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Introduceți parola</FormLabel>
                <FormControl>
                  <div className='relative'>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Introduceți parola'
                      {...field}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className='h-4 w-4 text-gray-500' />
                      ) : (
                        <Eye className='h-4 w-4 text-gray-500' />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button type='submit' disabled={isPending} className='w-full'>
              {isPending ? 'Se autentifică...' : 'Intră în cont'}
            </Button>
          </div>
          <div className='text-sm'>
            Prin autentificare, sunteti de acord cu{' '}
            <Link href='/page/termeni-si-conditii'>Termenii și Condițiile</Link>{' '}
            si{' '}
            <Link href='/page/politica-de-confidentialitate'>
              Politica de Confidențialitate
            </Link>{' '}
            a SC {APP_NAME} SRL
          </div>
        </div>
      </form>
    </Form>
  )
}
