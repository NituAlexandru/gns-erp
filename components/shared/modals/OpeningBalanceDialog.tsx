'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import {
  CreateOpeningBalanceSchema,
  CreateOpeningBalanceInput,
} from '@/lib/db/modules/financial/initial-balance/initial-balance.validator'
import { createClientOpeningBalance } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { createSupplierOpeningBalance } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'

interface OpeningBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
  type: 'CLIENT' | 'SUPPLIER'
}

export function OpeningBalanceDialog({
  open,
  onOpenChange,
  partnerId,
  type,
}: OpeningBalanceDialogProps) {
  const [isPending, startTransition] = useTransition()

  // Stare locală pentru direcția soldului: 'POSITIVE' sau 'NEGATIVE'
  // POSITIVE = Datorie (Clientul ne datorează / Noi datorăm furnizorului)
  // NEGATIVE = Avans (Clientul a plătit în avans / Noi am plătit furnizorului în avans)
  const [balanceDirection, setBalanceDirection] = useState<
    'POSITIVE' | 'NEGATIVE'
  >('POSITIVE')

  const form = useForm<CreateOpeningBalanceInput>({
    resolver: zodResolver(CreateOpeningBalanceSchema),
    defaultValues: {
      partnerId: partnerId,
      amount: 0,
      details: '',
      date: new Date('2025-12-31'),
    },
  })
// 
  const onSubmit = (data: CreateOpeningBalanceInput) => {
    // Aici facem conversia semnului
    const finalAmount =
      balanceDirection === 'NEGATIVE'
        ? -Math.abs(data.amount)
        : Math.abs(data.amount)

    const payload = {
      ...data,
      amount: finalAmount,
      date: new Date('2025-12-31'),
    }

    startTransition(async () => {
      try {
        let result
        if (type === 'CLIENT') {
          result = await createClientOpeningBalance(payload)
        } else {
          result = await createSupplierOpeningBalance(payload)
        }

        if (result.success) {
          toast.success(result.message)
          onOpenChange(false)
          form.reset()
          setBalanceDirection('POSITIVE') // Reset
        } else {
          toast.error('Eroare', { description: result.message })
        }
      } catch (error) {
        toast.error('A apărut o eroare neașteptată.')
        console.error(error)
      }
    })
  }

  // Texte dinamice în funcție de tipul partenerului
  const positiveLabel =
    type === 'CLIENT'
      ? 'Clientul are de plată (Debit)'
      : 'Avem datorie la Furnizor'

  const negativeLabel =
    type === 'CLIENT'
      ? 'Clientul are avans la noi (Credit)'
      : 'Avem avans la Furnizor'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            Setare Sold Inițial {type === 'CLIENT' ? 'Client' : 'Furnizor'}
          </DialogTitle>
          <DialogDescription>
            Configurați soldul istoric la momentul începerii lucrului în
            aplicație.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <input
              type='hidden'
              {...form.register('partnerId')}
              value={partnerId}
            />

            {/* SELECTOR TIP SOLD (Radio Buttons) */}
            <div className='space-y-3 border p-4 rounded-md bg-muted/20'>
              <Label className='text-sm font-semibold'>Tipul Soldului:</Label>
              <RadioGroup
                defaultValue='POSITIVE'
                value={balanceDirection}
                onValueChange={(val) =>
                  setBalanceDirection(val as 'POSITIVE' | 'NEGATIVE')
                }
                className='flex flex-col space-y-1'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='POSITIVE' id='r1' />
                  <Label htmlFor='r1' className='cursor-pointer font-normal'>
                    {positiveLabel}{' '}
                    <span className='text-green-600 font-bold ml-1'>(+)</span>
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='NEGATIVE' id='r2' />
                  <Label htmlFor='r2' className='cursor-pointer font-normal'>
                    {negativeLabel}{' '}
                    <span className='text-red-600 font-bold ml-1'>(-)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='date'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Data Soldului</FormLabel>
                    <FormControl>
                      <Input
                        value='31 decembrie 2025'
                        readOnly
                        disabled
                        className='cursor-not-allowed opacity-100 bg-muted font-semibold'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suma (RON)</FormLabel>
                    <FormControl>
                      {/* Utilizatorul introduce mereu pozitiv */}
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        min='0'
                        {...field}
                        onChange={(e) =>
                          field.onChange(Math.abs(parseFloat(e.target.value)))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='details'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalii (Opțional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Ex: Preluare sold contabil...'
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Anulează
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Salvează Sold
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
