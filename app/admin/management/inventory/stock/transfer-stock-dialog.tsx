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
import { transferStock } from '@/lib/db/modules/inventory/inventory.actions.operations'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import {
  TransferStockInput,
  transferStockSchema,
} from '@/lib/db/modules/inventory/validator'

interface TransferStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItemId: string
  batchId: string
  sourceLocation: string
  currentQuantity: number
  stockableItemName: string
  unit: string
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
}: TransferStockDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const form = useForm<TransferStockInput>({
    resolver: zodResolver(transferStockSchema),
    defaultValues: {
      sourceInventoryItemId: inventoryItemId,
      batchId: batchId,
      quantity: 0,
    },
  })

  async function onSubmit(data: TransferStockInput) {
    setIsPending(true)
    try {
      const res = await transferStock(data)
      if (res.success) {
        toast.success('Transfer realizat cu succes')
        onOpenChange(false)
        form.reset()
      } else {
        toast.error(res.error || 'Transferul a eșuat')
      }
    } catch (error) {
      toast.error('Eroare de conexiune')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] bg-background text-foreground border border-border'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ArrowRightLeft className='h-5 w-5 text-muted-foreground' />
            Transferă Stoc
          </DialogTitle>
          <DialogDescription>
            Din:{' '}
            <span className='font-semibold text-foreground'>
              {LOCATION_NAMES_MAP[
                sourceLocation as keyof typeof LOCATION_NAMES_MAP
              ] || sourceLocation}
            </span>
            <br />
            Produs: {stockableItemName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
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
                      <SelectTrigger className='bg-background'>
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
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Disponibil în lot: {currentQuantity} {unit}
                  </FormDescription>
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
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Confirmă Transfer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
