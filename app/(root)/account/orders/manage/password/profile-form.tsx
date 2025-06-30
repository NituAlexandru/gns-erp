'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import { updateUserPassword } from '@/lib/db/modules/user/user.actions'
import { UserPasswordUpdateSchema } from '@/lib/db/modules/user/validator'

export function PasswordForm() {
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof UserPasswordUpdateSchema>>({
    resolver: zodResolver(UserPasswordUpdateSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: z.infer<typeof UserPasswordUpdateSchema>) {
    const res = await updateUserPassword(values)
    if (!res.success) {
      return toast({
        description: res.message,
      })
    }
    toast({ description: res.message })
    // reîncărcăm pagina de Auth & Security
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
          name='password'
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormLabel className='font-bold'>Parolă Nouă</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='*****'
                  {...field}
                  className='input-field'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem className='w-full'>
              <FormLabel className='font-bold'>Confirmă Parolă</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='*****'
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
          {form.formState.isSubmitting ? 'Se salvează…' : 'Salvează Parola'}
        </Button>
      </form>
    </Form>
  )
}
