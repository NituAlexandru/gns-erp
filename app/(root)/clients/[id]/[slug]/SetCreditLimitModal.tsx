'use client'

import { useEffect, useState } from 'react'
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
import { updateClientFinancialSettings } from '@/lib/db/modules/client/summary/client-summary.actions'
import { formatCurrency } from '@/lib/utils' // Acum chiar îl folosim
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  LOCKING_STATUS,
  LOCKING_STATUS_COLORS,
  LOCKING_STATUS_LABELS,
  LockingStatusType,
} from '@/lib/db/modules/client/summary/client-summary.constants'

const formSchema = z.object({
  limit: z.coerce
    .number({ invalid_type_error: 'Introduceți o valoare numerică' })
    .min(0, 'Valoarea trebuie să fie pozitivă'),
  lockingStatus: z.enum(['AUTO', 'MANUAL_BLOCK', 'MANUAL_UNBLOCK']),
  lockingReason: z.string().optional(),
})

interface SetCreditLimitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientSlug: string
  currentLimit: number
  currentStatus: LockingStatusType
  currentReason?: string
}

export function SetCreditLimitModal({
  open,
  onOpenChange,
  clientId,
  clientSlug,
  currentLimit,
  currentStatus,
  currentReason,
}: SetCreditLimitModalProps) {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      limit: currentLimit || 0,
      lockingStatus: currentStatus || LOCKING_STATUS.AUTO,
      lockingReason: currentReason || '',
    },
  })
  useEffect(() => {
    if (open) {
      form.reset({
        limit: currentLimit || 0,
        lockingStatus: currentStatus || LOCKING_STATUS.AUTO,
        lockingReason: currentReason || '', // <--- Și AICI
      })
    }
  }, [open, currentLimit, currentStatus, currentReason, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsPending(true)
    try {
      // Aici apelăm funcția nouă cu OBIECT, nu doar cu număr
      const result = await updateClientFinancialSettings(clientId, clientSlug, {
        limit: values.limit,
        lockingStatus: values.lockingStatus,
        lockingReason: values.lockingReason,
      })
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setIsPending(false)
    }
  }

  const onClearLimit = async () => {
    setIsPending(true)
    try {
      // Când dăm "Anulează Plafon", resetăm totul pe AUTO și limit 0/null
      const result = await updateClientFinancialSettings(clientId, clientSlug, {
        limit: null,
        lockingStatus: LOCKING_STATUS.AUTO, // Resetăm la Auto
        lockingReason: '', // Ștergem motivul
      })

      if (result.success) {
        toast.success('Plafon anulat cu succes.')
        onOpenChange(false)
        form.reset({
          limit: 0,
          lockingStatus: LOCKING_STATUS.AUTO,
          lockingReason: '',
        })
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Eroare la anularea plafonului.')
    } finally {
      setIsPending(false)
    }
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
            {/* Radio Buttons pentru Status */}
            <FormField
              control={form.control}
              name='lockingStatus'
              render={({ field }) => (
                <FormItem className='space-y-3 mt-4'>
                  <FormLabel>Mod de operare</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex flex-col space-y-1'
                    >
                      {Object.values(LOCKING_STATUS).map((status) => (
                        <FormItem
                          key={status}
                          className='flex items-center space-x-3 space-y-0'
                        >
                          <FormControl>
                            <RadioGroupItem value={status} />
                          </FormControl>
                          <FormLabel
                            className={`font-normal cursor-pointer ${LOCKING_STATUS_COLORS[status]}`}
                          >
                            {LOCKING_STATUS_LABELS[status]}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Textarea pentru Motiv (Apare conditionat) */}
            {form.watch('lockingStatus') !== 'AUTO' && (
              <FormField
                control={form.control}
                name='lockingReason'
                render={({ field }) => (
                  <FormItem className='mt-4'>
                    <FormLabel>Motiv (Obligatoriu)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='De ce modifici manual statusul?'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
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
                {isPending ? 'Se salvează...' : 'Salvează Informatii'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
