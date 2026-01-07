'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { updateUser } from '@/lib/db/modules/user/user.actions'
import { USER_ROLES } from '@/lib/constants'
import { IUser } from '@/lib/db/modules/user/user.model'
import { UserUpdateSchema } from '@/lib/db/modules/user/validator'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'

const UserEditForm = ({ user }: { user: IUser }) => {
  const router = useRouter()
  const [showPasswordField, setShowPasswordField] = useState(false)

  // 1. Definim formularul
  const form = useForm<z.infer<typeof UserUpdateSchema>>({
    resolver: zodResolver(UserUpdateSchema),
    defaultValues: {
      ...user,
      _id: user._id,
      active: user.active ?? true,
      password: '',
    },
  })

  // 2. Definim useWatch sub useForm (nu în interiorul lui)
  const isActive = useWatch({
    control: form.control,
    name: 'active',
  })

  const { toast } = useToast()

  async function onSubmit(values: z.infer<typeof UserUpdateSchema>) {
    try {
      const res = await updateUser({
        ...values,
        _id: user._id,
      })
      if (!res.success)
        return toast({
          description: res.message,
        })

      toast({
        description: res.message,
      })
      form.reset()
      router.push(`/admin/users`)
    } catch (error: any) {
      toast({
        description: error.message,
      })
    }
  }

  return (
    <Form {...form}>
      <form
        method='post'
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <div className='flex flex-col gap-5 md:flex-row'>
          <FormField
            control={form.control}
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
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți email-ul' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='flex flex-col gap-5 md:flex-row items-end'>
          <FormField
            control={form.control}
            name='role'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Rol</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectați un rol' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='active'
            render={({ field }) => (
              <FormItem className='w-full flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                <div className='space-y-0.5'>
                  <FormLabel>Status Cont</FormLabel>
                  <FormDescription className='text-xs'>
                    Dezactivarea va deloga utilizatorul imediat.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (checked && !user.active) setShowPasswordField(true)
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {(showPasswordField || !user.active) && isActive && (
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem className='max-w-md'>
                <FormLabel className=' font-bold'>
                  Setați Parolă Nouă (pentru reactivare)
                </FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder='Minim 8 caractere'
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className='flex gap-4'>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Se salvează...'
              : `Actualizează Utilizator`}
          </Button>
          <Button
            variant='outline'
            type='button'
            onClick={() => router.push(`/admin/users`)}
          >
            Înapoi
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default UserEditForm
