'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'

// Alert Dialog pentru duplicat
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { transferStock } from '@/lib/db/modules/inventory/inventory.actions.operations'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import {
  TransferStockInput,
  transferStockSchema,
} from '@/lib/db/modules/inventory/validator'
import { ReceptionDeliveries } from '@/app/admin/management/reception/reception-deliveries'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { IInvoice } from '@/lib/db/modules/reception/reception.model'

interface TransferStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItemId: string
  batchId: string
  sourceLocation: string
  currentQuantity: number
  stockableItemName: string
  unit: string
  vatRates: VatRateDTO[]
  invoices?: IInvoice[]
}

export function TransferStockDialog({
  open,
  onOpenChange,
  inventoryItemId,
  batchId,
  sourceLocation,
  currentQuantity,
  stockableItemName,
  unit,
  vatRates,
  invoices,
}: TransferStockDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [wantsToAttachDelivery, setWantsToAttachDelivery] = useState(false)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [pendingData, setPendingData] = useState<TransferStockInput | null>(
    null,
  )
  const [warningMessage, setWarningMessage] = useState('')

  const form = useForm<TransferStockInput>({
    resolver: zodResolver(transferStockSchema),
    defaultValues: {
      sourceInventoryItemId: inventoryItemId,
      batchId: batchId,
      quantity: 0,
      deliveries: [],
    },
  })

  async function onSubmit(data: TransferStockInput) {
    setIsPending(true)
    try {
      const validDeliveries =
        wantsToAttachDelivery && data.deliveries
          ? data.deliveries.filter(
              (d) => d.dispatchNoteNumber && d.dispatchNoteNumber.trim() !== '',
            )
          : []

      const payload: TransferStockInput = {
        ...data,
        deliveries: validDeliveries,
        deliveryDetails: undefined,
      }

      // Funcția principală de submit din actions
      const res = (await transferStock(payload)) as any

      // 1. Backend-ul a detectat duplicat
      if (res.requireConfirmation) {
        setWarningMessage(res.message)
        setPendingData(payload)
        setShowDuplicateWarning(true)
        return // OPRIM execuția aici
      }

      // 2. Răspuns de succes
      if (res.success) {
        toast.success('Transfer realizat cu succes')
        onOpenChange(false)
        form.reset()
        setWantsToAttachDelivery(false)
      } else {
        toast.error(res.error || 'Transferul a eșuat')
      }
    } catch (error) {
      toast.error('Eroare de conexiune')
    } finally {
      setIsPending(false)
    }
  }

  async function confirmBypassDuplicate() {
    if (!pendingData) return
    setShowDuplicateWarning(false)
    const forcedData = { ...pendingData, forceBypassDuplicateAviz: true }
    await onSubmit(forcedData)
  }

  function handleCancelWarning() {
    setShowDuplicateWarning(false)
    setPendingData(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-5xl bg-background text-foreground border border-border overflow-y-auto max-h-[90vh]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ArrowRightLeft className='h-5 w-5 text-muted-foreground' />
              Transferă Stoc
            </DialogTitle>
            <DialogDescription asChild>
              <div className='space-y-0'>
                <div>
                  <div className='grid grid-cols-2 gap-4 items-start w-full font-bold '>
                    <div>
                      Din:{' '}
                      <span className='text-primary'>
                        {LOCATION_NAMES_MAP[
                          sourceLocation as keyof typeof LOCATION_NAMES_MAP
                        ] || sourceLocation}
                      </span>
                    </div>

                    <div className='flex justify-end'>
                      {invoices && invoices.length > 0 && (
                        <div className='flex flex-wrap gap-1.5 items-center justify-end'>
                          <span className='text-sm font-bold text-primary'>
                            Factura:
                          </span>
                          {invoices.map((inv, idx) => (
                            <span
                              key={idx}
                              className='bg-muted px-1.5 py-0.5 rounded text-foreground font-medium text-xs border shadow-sm'
                            >
                              {inv.series} {inv.number}
                              {inv.date &&
                                ` / ${new Date(inv.date).toLocaleDateString('ro-RO')}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  Produs:{' '}
                  <span className='text-foreground font-medium'>
                    {stockableItemName}
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                {/* DESTINAȚIE */}
                <FormField
                  control={form.control}
                  name='targetLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Către Locația</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='bg-background cursor-pointer'>
                            <SelectValue
                              className='cursor-pointer'
                              placeholder='Selectează destinația...'
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='bg-accent '>
                          {INVENTORY_LOCATIONS.map((loc) => {
                            if (loc === sourceLocation) return null
                            return (
                              <SelectItem
                                className='cursor-pointer '
                                key={loc}
                                value={loc}
                              >
                                {LOCATION_NAMES_MAP[loc]}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CANTITATE */}
                <FormField
                  control={form.control}
                  name='quantity'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantitate ({unit})</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='0.00'
                          className='bg-background'
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription className='mt-2'>
                        <span className='bg-muted px-2 py-1 rounded text-primary font-bold text-sm border shadow-sm inline-block'>
                          Disponibil în lot: {currentQuantity} {unit}
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SECȚIUNEA PENTRU AVIZ  */}
              <Separator className='my-4' />
              <div className='flex items-center space-x-2 mb-2'>
                <Checkbox
                  id='attach-delivery'
                  checked={wantsToAttachDelivery}
                  onCheckedChange={(checked) =>
                    setWantsToAttachDelivery(!!checked)
                  }
                />
                <label
                  htmlFor='attach-delivery'
                  className='text-sm text-primary font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
                >
                  Atașează detalii de transport / aviz pentru acest transfer
                </label>
              </div>

              {wantsToAttachDelivery && (
                <ReceptionDeliveries vatRates={vatRates} isVatPayer={true} />
              )}

              <DialogFooter className='pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Anulează
                </Button>
                <Button type='submit' disabled={isPending}>
                  {isPending && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Confirmă Transfer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDuplicateWarning}
        onOpenChange={setShowDuplicateWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-orange-600'>
              Atenție: Aviz deja existent!
            </AlertDialogTitle>
            <AlertDialogDescription className='text-sm'>
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelWarning}
              disabled={isPending}
            >
              Nu, Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBypassDuplicate}
              disabled={isPending}
            >
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Da, transferă stocul
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
