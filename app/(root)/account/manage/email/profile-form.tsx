'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { updateUserEmail } from '@/lib/actions/user.actions'
import { UserEmailUpdateSchema } from '@/lib/validator'

interface EmailFormProps {
  defaultEmail: string
}

export function EmailForm({ defaultEmail }: EmailFormProps) {
  const router = useRouter()
  const { data: session, update } = useSession()
  const { toast } = useToast()

  // Inițializăm react-hook-form cu schema de validare a email-ului
  const form = useForm<z.infer<typeof UserEmailUpdateSchema>>({
    resolver: zodResolver(UserEmailUpdateSchema),
    defaultValues: { email: defaultEmail },
  })

  async function onSubmit(values: z.infer<typeof UserEmailUpdateSchema>) {
    // 1) Trimitem noul email la server
    const res = await updateUserEmail(values)
    if (!res.success) {
      // Dacă a eșuat validarea sau serverul a returnat eroare, afișăm toast
      return toast({
        description: res.message,
      })
    }

    // 2) Dacă a fost OK, actualizăm sesiunea locală
    if (session) {
      // Construim un nou obiect de sesiune cu emailul actualizat
      const newSession = {
        ...session,
        user: {
          ...session.user,
          email: values.email,
        },
      }
      await update(newSession)
      // 3) Afișăm toast de succes și redirecționăm / reîncărcăm pagina
      toast({
        description: 'Email actualizat cu succes.',
      })
      router.push('/account/manage')
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-5'
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormLabel className='font-bold'>Email Nou</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='email@exemplu.com'
                  {...field}
                  className='input-field'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type='submit'
          size='lg'
          disabled={form.formState.isSubmitting}
          className='button w-full'
        >
          {form.formState.isSubmitting ? 'Se salvează…' : 'Salvează email'}
        </Button>
      </form>
    </Form>
  )
}
