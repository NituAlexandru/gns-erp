'use client'

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
import { UNITS } from '@/lib/constants'
import { OrderLineItemRowProps } from './OrderLineItemRow'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'

interface ManualLineItemRowProps extends OrderLineItemRowProps {
  itemData: OrderLineItemInput
}

export function ManualLineItemRow({
  index,
  vatRates,
  remove,
  itemData,
}: ManualLineItemRowProps) {
  const { control } = useFormContext()

  // Extragem datele necesare pentru calculele live
  const {
    priceAtTimeOfOrder = 0,
    quantity = 0,
    vatRateDetails,
  } = itemData || {}

  const lineSubtotal = priceAtTimeOfOrder * quantity
  const lineVatValue = (vatRateDetails?.rate / 100) * lineSubtotal
  const lineTotal = lineSubtotal + lineVatValue

  return (
    <TableRow>
      <TableCell className='font-medium w-full'>
        <Controller
          name={`lineItems.${index}.productName`}
          control={control}
          defaultValue=''
          render={({ field }) => (
            <Input {...field} placeholder='Descriere operațiune...' />
          )}
        />
      </TableCell>

      <TableCell>
        <Controller
          name={`lineItems.${index}.quantity`}
          control={control}
          defaultValue={1}
          render={({ field }) => (
            <Input
              {...field}
              type='number'
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
        <Controller
          name={`lineItems.${index}.unitOfMeasure`}
          control={control}
          defaultValue='buc'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className='w-[100px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>

      <TableCell className='w-[150px]'>
        <Controller
          name={`lineItems.${index}.priceAtTimeOfOrder`}
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <Input
              {...field}
              type='number'
              step='0.01'
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              onBlur={(e) => {
                const numValue = parseFloat(e.target.value)
                if (!isNaN(numValue)) {
                  field.onChange(numValue.toFixed(2))
                }
              }}
              className='w-full min-w-[100px]'
            />
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

      {/* Câmpuri calculate */}
      <TableCell className='w-[150px] text-right'>
        {formatCurrency(lineSubtotal)}
      </TableCell>
      <TableCell className='w-[150px] text-right py-3'>
        {formatCurrency(lineVatValue)}
      </TableCell>
      <TableCell className='w-[150px] text-right'>
        {formatCurrency(lineTotal)}
      </TableCell>

      {/* Butonul de ștergere */}
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
