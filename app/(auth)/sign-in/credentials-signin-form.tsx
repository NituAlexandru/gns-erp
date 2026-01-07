'use client'

import { redirect, useSearchParams } from 'next/navigation'
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
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const form = useForm<IUserSignIn>({
    resolver: zodResolver(UserSignInSchema),
    defaultValues: signInDefaultValues,
  })

  const { control, handleSubmit } = form

  const onSubmit = async (data: IUserSignIn) => {
    try {
      const result = await signInWithCredentials({
        email: data.email,
        password: data.password,
      })

      // Dacă rezultatul returnează o eroare de tip AccessDenied
      if (result?.error === 'CredentialsSignin') {
        toast.error('Email sau parolă incorecte')
      }
    } catch (error) {
      toast.error('Acces refuzat', {
        description: 'Contactați adminul pentru crearea contului.',
      })
    }
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
                  <Input
                    type='password'
                    placeholder='Enter password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Button type='submit'>Intră în cont</Button>
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
