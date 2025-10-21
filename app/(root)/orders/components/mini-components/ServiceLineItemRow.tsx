'use client'

import { useEffect, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { OrderLineItemRowProps } from './OrderLineItemRow'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { toast } from 'sonner'

interface ServiceLineItemRowProps extends OrderLineItemRowProps {
  itemData: OrderLineItemInput
}

export function ServiceLineItemRow({
  index,
  vatRates,
  remove,
  itemData,
}: ServiceLineItemRowProps) {
  const { control, setValue } = useFormContext()

  const {
    priceAtTimeOfOrder = 0,
    quantity = 0,
    vatRateDetails,
    productName,
    unitOfMeasure,
  } = itemData || {}

  const [minimumPrice] = useState(itemData.priceAtTimeOfOrder)

  const vatRate = vatRateDetails?.rate || 0

  // useEffect pentru calculul live al valorii TVA
  useEffect(() => {
    const lineSubtotal = priceAtTimeOfOrder * quantity
    const calculatedVatValue = (vatRate / 100) * lineSubtotal
    setValue(`lineItems.${index}.vatRateDetails.value`, calculatedVatValue, {
      shouldDirty: true,
    })
  }, [priceAtTimeOfOrder, quantity, vatRate, index, setValue])

  const lineSubtotal = priceAtTimeOfOrder * quantity
  const lineVatValue = vatRateDetails?.value || 0
  const lineTotal = lineSubtotal + lineVatValue

  return (
    <TableRow>
      <TableCell className='font-medium w-full '>{productName}</TableCell>

      <TableCell>
        <Controller
          name={`lineItems.${index}.quantity`}
          control={control}
          defaultValue={1}
          render={({ field }) => (
            <Input
              {...field}
              type='number'
              onChange={(e) => {
                field.onChange(parseFloat(e.target.value) || 0)
              }}
              onBlur={(e) => {
                const numValue = parseFloat(e.target.value)
                if (!isNaN(numValue)) {
                  field.onChange(numValue.toFixed(2))
                }
              }}
              className='min-w-[100px]'
            />
          )}
        />
      </TableCell>
      <TableCell>
        <div className='flex h-9 w-[100px] items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs opacity-50 cursor-not-allowed text-muted-foreground dark:bg-input/30'>
          {unitOfMeasure}
        </div>
      </TableCell>

      <TableCell className='w-[150px]'>
        <Controller
          name={`lineItems.${index}.priceAtTimeOfOrder`}
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <div className='relative'>
              {/* Afișaj pentru Pret Minim */}
              <p className='absolute bottom-8 left-0 right-0 mb-1 text-center text-xs text-muted-foreground'>
                Pret Minim:{' '}
                <span className='font-bold text-primary'>
                  {formatCurrency(minimumPrice)}
                </span>
              </p>
              <Input
                {...field}
                type='number'
                step='0.01'
                onChange={(e) =>
                  field.onChange(parseFloat(e.target.value) || 0)
                }
                onBlur={(e) => {
                  let numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue)) {
                    // Verifică dacă prețul este sub minim
                    if (numValue < minimumPrice) {
                      numValue = minimumPrice
                      toast.info(
                        `Prețul pentru "${productName}" a fost ajustat la minimul acceptat.`
                      )
                    }

                    setValue(`lineItems.${index}.priceAtTimeOfOrder`, numValue)

                    field.onChange(numValue.toFixed(2))
                  }
                }}
                className='w-full min-w-[100px]'
              />
            </div>
          )}
        />
      </TableCell>

      <TableCell className='w-[120px]'>
        <Controller
          name={`lineItems.${index}.vatRateDetails.rate`}
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(parseFloat(value))}
              value={field.value?.toString()}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vatRates.map((vat) => (
                  <SelectItem key={vat._id} value={vat.rate.toString()}>
                    {vat.rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>

      <TableCell className='w-[150px] text-right'>
        {formatCurrency(lineSubtotal)}
      </TableCell>
      <TableCell className='w-[150px] text-right py-3'>
        {formatCurrency(lineVatValue)}
      </TableCell>
      <TableCell className='w-[150px] text-right'>
        {formatCurrency(lineTotal)}
      </TableCell>

      <TableCell className='w-[50px]'>
        <Button
          variant='ghost'
          size='icon'
          type='button'
          onClick={() => remove(index)}
        >
          <Trash2 className='h-4 w-4 text-destructive' />
        </Button>
      </TableCell>
    </TableRow>
  )
}
