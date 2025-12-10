'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Info, Loader2 } from 'lucide-react'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { adjustStock } from '@/lib/db/modules/inventory/inventory.actions.operations'
import {
  MANUAL_ADJUSTMENT_TYPES,
  MOVEMENT_TYPE_DETAILS_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import {
  AdjustStockInput,
  adjustStockSchema,
} from '@/lib/db/modules/inventory/validator'

interface AdjustStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItemId: string
  batchId?: string
  currentQuantity?: number
  currentUnitCost?: number
  stockableItemName: string
  unit: string
}

export function AdjustStockDialog({
  open,
  onOpenChange,
  inventoryItemId,
  batchId,
  currentQuantity,
  currentUnitCost,
  stockableItemName,
  unit,
}: AdjustStockDialogProps) {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      inventoryItemId,
      batchId,
      quantity: 0,
      reason: '',
    },
  })

  const selectedType = form.watch('adjustmentType')
  const isInputType = selectedType && IN_TYPES.has(selectedType)
  const isOutputType = selectedType && !IN_TYPES.has(selectedType)
  const inputOptions = MANUAL_ADJUSTMENT_TYPES.filter((t) => IN_TYPES.has(t))
  const outputOptions = MANUAL_ADJUSTMENT_TYPES.filter((t) => !IN_TYPES.has(t))

  async function onSubmit(data: AdjustStockInput) {
    setIsPending(true)
    try {
      const res = await adjustStock(data)
      if (res.success) {
        toast.success('Stoc actualizat cu succes')
        onOpenChange(false)
        form.reset()
      } else {
        toast.error(res.error || 'A apărut o eroare')
      }
    } catch (error) {
      toast.error('Eroare de conexiune')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] bg-background text-foreground '>
        <DialogHeader>
          <DialogTitle>Ajustare Manuală Stoc</DialogTitle>
          <DialogDescription>
            {stockableItemName}
            {batchId ? ` - Lot existent` : ' - Lot Nou'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4 items-start'>
              {/* TIP AJUSTARE */}
              <FormField
                control={form.control}
                name='adjustmentType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Operațiune</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selectează motivul...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='bg-background border-input'>
                        {/* GRUPUL 1: INTRĂRI */}
                        <SelectGroup>
                          <SelectLabel className='text-green-600 px-2 py-1.5 text-sm font-semibold'>
                            Intrări (Adaugă Stoc)
                          </SelectLabel>
                          {inputOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {MOVEMENT_TYPE_DETAILS_MAP[type]?.name || type}
                            </SelectItem>
                          ))}
                        </SelectGroup>

                        {/* GRUPUL 2: IEȘIRI (Doar dacă există lot/batchId) */}
                        {batchId && (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel className='text-red-600 px-2 py-1.5 text-sm font-semibold'>
                                Ieșiri (Scade Stoc)
                              </SelectLabel>
                              {outputOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {MOVEMENT_TYPE_DETAILS_MAP[type]?.name ||
                                    type}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />{' '}
              {/* 1. CANTITATE (Rămâne neschimbat) */}
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
                      />
                    </FormControl>
                    {batchId && currentQuantity !== undefined && (
                      <FormDescription className='text-xs'>
                        Disponibil lot: {currentQuantity} {unit}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 2. PREȚ UNITAR (AFIȘAT MEREU, INDIFERENT DE TIP) */}
              <FormField
                control={form.control}
                name='unitCost'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preț Unitar (RON)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='Automat'
                        className='bg-background'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      Opțional. Lasă gol pentru calcul automat.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 3. MESAJE DE INFORMARE (Apar sub grid, doar dacă nu e introdus preț) */}
              {!form.watch('unitCost') && (
                <div className='mt-2'>
                  {/* MESAJ PENTRU INTRĂRI (CMP) */}
                  {isInputType && (
                    <div className='rounded-md bg-blue-50 p-3 border border-blue-200 flex gap-2 items-start'>
                      <div className='flex flex-col text-xs text-blue-800'>
                        <span className='font-bold flex items-center gap-2'>
                          <Info className='h-4 w-4 text-blue-600 shrink-0' />
                          Info:
                        </span>{' '}
                        <span>
                          {currentUnitCost ? (
                            <>
                              Produsul va intra în stoc la Costul Mediu Ponderat
                              (CMP) al lotului curent, de{' '}
                              <strong>
                                {currentUnitCost.toLocaleString('ro-RO', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                RON / {unit}
                              </strong>
                              .
                            </>
                          ) : (
                            // Fallback dacă nu avem istoric de preț
                            'Produsul va intra în stoc la Costul Mediu Ponderat (CMP) calculat de sistem.'
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MESAJ PENTRU IEȘIRI (FIFO/Specific) */}
                  {isOutputType && (
                    <div className='rounded-md bg-orange-50 p-2 border border-orange-200 flex gap-2 items-start'>
                      <div className='text-xs text-orange-800 flex flex-col'>
                        <span className='font-bold flex items-center gap-2'>
                          <AlertCircle className='h-4 w-4 text-orange-600 shrink-0' />
                          Info:{' '}
                        </span>
                        {batchId && currentUnitCost ? (
                          <span>
                            Cantitatea se va scădea din acest lot la costul său
                            de achiziție de{' '}
                            <strong>
                              {currentUnitCost.toLocaleString('ro-RO', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              RON / {unit}
                            </strong>
                            .
                          </span>
                        ) : (
                          <span>
                            Nu există un preț fix. Sistemul va scădea automat
                            costul prin metoda <strong>FIFO</strong>.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MOTIV */}
            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motiv / Observații (Obligatoriu)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Ex: Găsit la inventar anual...'
                      className='bg-background'
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
                disabled={isPending}
              >
                Anulează
              </Button>
              <Button type='submit' variant='default' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Salvează Ajustarea
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
