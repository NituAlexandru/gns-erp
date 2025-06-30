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
import { updateUserPhone } from '@/lib/db/modules/user/user.actions'
import { UserPhoneUpdateSchema } from '@/lib/db/modules/user/validator'

interface PhoneFormProps {
  defaultPhone: string
}

export function PhoneForm({ defaultPhone }: PhoneFormProps) {
  const router = useRouter()
  const { data: session, update } = useSession()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof UserPhoneUpdateSchema>>({
    resolver: zodResolver(UserPhoneUpdateSchema),
    defaultValues: { phone: defaultPhone },
  })

  async function onSubmit(values: z.infer<typeof UserPhoneUpdateSchema>) {
    const res = await updateUserPhone(values)
    if (!res.success) {
      return toast({
        description: res.message,
      })
    }

    // Dacă actualizarea DB a reușit, punem noul phone în session.local
    if (session) {
      const newSession = {
        ...session,
        user: {
          ...session.user,
          phone: values.phone,
        },
      }
      await update(newSession)
    }

    toast({ description: res.message })
    // Forțăm re-randarea server + client (pentru orice alt loc unde folosim session.user.phone)
    router.push('/account/manage')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-5'
      >
        <FormField
          control={form.control}
          name='phone'
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormLabel className='font-bold'>Numar Telefon Nou</FormLabel>
              <FormControl>
                <Input
                  type='tel'
                  placeholder='07xxxxxxxx'
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
          {form.formState.isSubmitting ? 'Se salvează…' : 'Salvează numărul'}
        </Button>
      </form>
    </Form>
  )
}
