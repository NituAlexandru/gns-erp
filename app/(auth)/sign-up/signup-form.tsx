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
import { IUserSignUp } from '@/types'
import { registerUser, signInWithCredentials } from '@/lib/actions/user.actions'
import { toast } from '@/hooks/use-toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserSignUpSchema } from '@/lib/validator'
import { Separator } from '@/components/ui/separator'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { APP_NAME } from '@/lib/constants'

const signUpDefaultValues =
  process.env.NODE_ENV === 'development'
    ? {
        name: 'alex',
        email: 'admin@example.com',
        password: '12345',
        confirmPassword: '12345',
      }
    : {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      }

export default function SignUpForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const form = useForm<IUserSignUp>({
    resolver: zodResolver(UserSignUpSchema),
    defaultValues: signUpDefaultValues,
  })

  const { control, handleSubmit } = form

  const onSubmit = async (data: IUserSignUp) => {
    try {
      const res = await registerUser(data)
      if (!res.success) {
        toast({
          title: 'Eroare',
          description: res.error,
        })
        return
      }
      await signInWithCredentials({
        email: data.email,
        password: data.password,
      })
      redirect(callbackUrl)
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      toast({
        title: 'Eroare',
        description:
          'Ceva nu a funcționat corect. Te rugăm să încerci din nou.',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='space-y-6'>
          <FormField
            control={control}
            name='name'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Nume</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți numele' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name='email'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți adresa de email' {...field} />
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
                <FormLabel>Parolă</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder='Introduceți parola'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='confirmPassword'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Confirmare parolă</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder='Confirmare parolă'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Button type='submit'>Creează cont</Button>
          </div>
          <div className='text-sm'>
            Prin crearea unui cont, ești de acord cu{' '}
            <Link
              href='/page/termeni-si-conditii'
              className='underline hover:text-primary'
            >
              Termenii și Condițiile
            </Link>{' '}
            și{' '}
            <Link
              href='/page/politica-de-confidentialitate'
              className='underline hover:text-primary'
            >
              Politica de Confidențialitate
            </Link>{' '}
            ale SC {APP_NAME} SRL.
          </div>
          <Separator className='mb-4' />
          <div className='text-sm'>
            Ai deja un cont?{' '}
            <Link className='link' href={`/sign-in?callbackUrl=${callbackUrl}`}>
              Autentifică-te
            </Link>
          </div>
        </div>
      </form>
    </Form>
  )
}
