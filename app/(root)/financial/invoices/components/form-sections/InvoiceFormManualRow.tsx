'use client'

import { useEffect } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, round2 } from '@/lib/utils'
import { UNITS } from '@/lib/constants'
import { InvoiceInput } from '@/lib/db/modules/financial/invoices/invoice.types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { FormControl } from '@/components/ui/form'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'

interface InvoiceFormManualRowProps {
  index: number
  vatRates: VatRateDTO[]
  remove: (index: number) => void
}

export function InvoiceFormManualRow({
  index,
  vatRates,
  remove,
}: InvoiceFormManualRowProps) {
  const { control, setValue, watch } = useFormContext<InvoiceInput>()
  const invoiceType = watch('invoiceType')
  const isStornoRow = invoiceType === 'STORNO'
  const itemData = watch(`items.${index}`)
  const { unitPrice = 0, quantity = 0, vatRateDetails } = itemData || {}

  useEffect(() => {
    const vatRate = vatRateDetails?.rate || 0
    const lineValue = round2(unitPrice * quantity)
    const lineVatValue = round2(lineValue * (vatRate / 100))
    const lineTotal = round2(lineValue + lineVatValue)

    setValue(`items.${index}.lineValue`, lineValue, { shouldDirty: true })
    setValue(`items.${index}.vatRateDetails.value`, lineVatValue, {
      shouldDirty: true,
    })
    setValue(`items.${index}.lineTotal`, lineTotal, { shouldDirty: true })
  }, [unitPrice, quantity, vatRateDetails?.rate, index, setValue])

  const lineValue = itemData?.lineValue || 0
  const lineVatValue = itemData?.vatRateDetails?.value || 0
  const lineTotal = itemData?.lineTotal || 0

  return (
    <TableRow className='bg-muted/30'>
      {/* 1. Numărul Curent */}
      <TableCell className='w-[40px] text-center p-2 font-medium text-muted-foreground'>
        {index + 1}
      </TableCell>

      {/* 2. Produs (Nume) + Buton Ștergere */}
      <TableCell className='font-medium'>
        <div className='flex items-center gap-2'>
          <Controller
            name={`items.${index}.productName`}
            control={control}
            defaultValue=''
            render={({ field }) => (
              <Input
                {...field}
                placeholder='Descriere serviciu / taxă...'
                className='flex-1'
              />
            )}
          />
        </div>
      </TableCell>

      {/* 3. Cantitate */}
      <TableCell className='w-[120px]'>
        <Controller
          name={`items.${index}.quantity`}
          control={control}
          defaultValue={1}
          render={({ field }) =>
            isStornoRow ? (
              <div className='flex items-center relative'>
                <span className='absolute left-2 text-muted-foreground font-bold'>
                  -
                </span>
                <Input
                  {...field}
                  type='number'
                  step='any'
                  // Afișăm pozitiv
                  value={field.value ? Math.abs(field.value) : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    // Salvăm negativ
                    field.onChange(-Math.abs(val))
                  }}
                  className='w-full text-right pl-6'
                />
              </div>
            ) : (
              // Input normal pentru facturi Standard/Avans
              <Input
                {...field}
                type='number'
                step='any'
                onChange={(e) =>
                  field.onChange(parseFloat(e.target.value) || 0)
                }
                className='w-full text-right'
              />
            )
          }
        />
      </TableCell>

      {/* 4. Unitate de Măsură (UM) */}
      <TableCell className='w-[100px]'>
        <Controller
          name={`items.${index}.unitOfMeasure`}
          control={control}
          defaultValue='bucata'
          render={({ field }) => (
            <Select
              onValueChange={(value) => {
                field.onChange(value)
                setValue(
                  `items.${index}.unitOfMeasureCode`,
                  getEFacturaUomCode(value)
                )
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
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

      {/* 5. Preț Unitar */}
      <TableCell className='w-[120px]'>
        <Controller
          name={`items.${index}.unitPrice`}
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <Input
              {...field}
              type='number'
              step='0.01'
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              className='w-full text-right'
            />
          )}
        />
      </TableCell>

      {/* 6. Valoare Fără TVA */}
      <TableCell className='w-[120px] text-right font-medium'>
        {formatCurrency(lineValue)}
      </TableCell>

      {/* 7. TVA % */}
      <TableCell className='w-[100px]'>
        <Controller
          name={`items.${index}.vatRateDetails.rate`}
          control={control}
          defaultValue={vatRates[0]?.rate || 21}
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(parseFloat(value))}
              value={field.value?.toString()}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
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

      {/* 8. Suma TVA */}
      <TableCell className='w-[100px] text-right text-sm'>
        {formatCurrency(lineVatValue)}
      </TableCell>

      {/* 9. Total Final (Cu TVA) */}
      <TableCell className='w-[150px] text-right font-semibold text-primary'>
        {formatCurrency(lineTotal)}
      </TableCell>
      <TableCell className='w-[40px] p-2'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='text-destructive hover:text-destructive'
          onClick={() => remove(index)}
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </TableCell>
    </TableRow>
  )
}
