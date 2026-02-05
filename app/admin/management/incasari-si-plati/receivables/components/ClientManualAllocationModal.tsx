'use client'

import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { formatCurrency, round2 } from '@/lib/utils'
import { UnpaidInvoice, PopulatedClientPayment } from './AllocationModal'
import { createManualAllocation } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { useEffect, useState } from 'react'

interface ClientManualAllocationModalProps {
  invoice: UnpaidInvoice | null
  payment: PopulatedClientPayment | null
  onClose: () => void
  onAllocationCreated: () => void
}

// Schema Zod
const AllocationFormSchema = z.object({
  amount: z
    .number({ required_error: 'Suma este obligatorie.' })
    .positive('Suma trebuie să fie mai mare ca 0.'),
})
type AllocationFormValues = z.infer<typeof AllocationFormSchema>

export function ClientManualAllocationModal({
  invoice,
  payment,
  onClose,
  onAllocationCreated,
}: ClientManualAllocationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isOpen = !!invoice && !!payment

  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(AllocationFormSchema),
    defaultValues: {
      amount: 0,
    },
  })

  // Precompletare cu suma maximă
  useEffect(() => {
    if (invoice && payment) {
      const maxAllocatable = Math.min(
        payment.unallocatedAmount,
        invoice.remainingAmount,
      )
      form.reset({ amount: round2(maxAllocatable) })
    }
  }, [invoice, payment, form])

  if (!isOpen || !invoice || !payment) return null

  const maxAmount = Math.min(payment.unallocatedAmount, invoice.remainingAmount)

  async function onSubmit(data: AllocationFormValues) {
    if (!invoice || !payment) return

    const amountToAllocate = round2(data.amount)

    // Validări UI
    if (amountToAllocate > round2(payment.unallocatedAmount)) {
      toast.error('Suma depășește suma nealocată a încasării.')
      return
    }
    if (amountToAllocate > round2(invoice.remainingAmount)) {
      toast.error('Suma depășește restul de plată al facturii.')
      return
    }

    setIsSubmitting(true)
    try {
      // Apelăm acțiunea de CLIENT (createManualAllocation)
      const result = await createManualAllocation({
        paymentId: payment._id,
        invoiceId: invoice._id,
        amountAllocated: amountToAllocate,
        allocationDate: new Date(),
      })

      if (result.success) {
        toast.success('Alocare salvată!')
        onAllocationCreated()
        onClose()
      } else {
        toast.error('Eroare la alocare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Alocă Manual Factura {invoice.seriesName}-{invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription asChild>
            <div className='space-y-3'>
              <p className='text-muted-foreground'>
                Introdu suma din încasare pe care vrei să o aloci acestei
                facturi.
              </p>

              <div className='p-3 border rounded-md bg-muted'>
                <div className='text-sm space-y-1 text-muted-foreground'>
                  <div className='flex justify-between'>
                    <span>Încasare Nealocată:</span>
                    <span className='font-medium'>
                      {formatCurrency(payment.unallocatedAmount)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Factură Rest de Plată:</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.remainingAmount)}
                    </span>
                  </div>
                  <div className='pt-2 mt-2 border-t border-border flex justify-between font-bold text-primary'>
                    <span>Maxim Alocabil:</span>
                    <span>{formatCurrency(maxAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sumă de Alocat</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Anulează
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Salvează Alocarea
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
