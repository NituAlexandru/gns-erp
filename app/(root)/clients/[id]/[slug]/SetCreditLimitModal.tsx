'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { setClientCreditLimit } from '@/lib/db/modules/client/summary/client-summary.actions'
import { formatCurrency } from '@/lib/utils' // Acum chiar îl folosim

const formSchema = z.object({
  limit: z.coerce
    .number({ invalid_type_error: 'Introduceți o valoare numerică' })
    .min(0, 'Valoarea trebuie să fie pozitivă'),
})

interface SetCreditLimitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientSlug: string
  currentLimit: number
}

export function SetCreditLimitModal({
  open,
  onOpenChange,
  clientId,
  clientSlug,
  currentLimit,
}: SetCreditLimitModalProps) {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      limit: currentLimit || 0,
    },
  })

  // ... (handleSetLimit, onSubmit, onClearLimit - rămân neschimbate)
  const handleSetLimit = async (limitValue: number | null) => {
    setIsPending(true)
    try {
      const result = await setClientCreditLimit(
        clientId,
        clientSlug,
        limitValue
      )
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        form.reset({ limit: limitValue || 0 })
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setIsPending(false)
    }
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    handleSetLimit(values.limit)
  }

  const onClearLimit = () => {
    handleSetLimit(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Setare Plafon Credit</DialogTitle>
          <DialogDescription>
            Setați limita de credit pentru acest client. Soldul curent va fi
            comparat cu această valoare.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='limit'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plafon Credit (RON)</FormLabel>
                  <FormControl>
                    <Input type='number' placeholder='Ex: 5000' {...field} />
                  </FormControl>
                  <FormDescription>
                    Valoarea curentă setată: {formatCurrency(currentLimit)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='gap-2 sm:justify-between'>
              <Button
                type='button'
                variant='destructive'
                onClick={onClearLimit}
                disabled={isPending}
              >
                Anulează Plafon
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Se salvează...' : 'Salvează Plafon'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
