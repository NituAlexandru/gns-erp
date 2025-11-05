'use client'

import { useEffect, useMemo } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency, round2 } from '@/lib/utils'
import {
  InvoiceInput,
  InvoiceLineInput,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { LineProfitDisplay } from './LineProfitDisplay'

interface InvoiceFormProductRowProps {
  index: number
  itemData: InvoiceLineInput
}

export function InvoiceFormProductRow({
  index,
  itemData,
}: InvoiceFormProductRowProps) {
  const { control, setValue, watch } = useFormContext<InvoiceInput>()
  const watchedUnitPrice = watch(`items.${index}.unitPrice`, itemData.unitPrice)
  const lineProfit = watch(`items.${index}.lineProfit`)
  const lineMargin = watch(`items.${index}.lineMargin`)

  const {
    quantity,
    vatRateDetails,
    productName,
    productCode,
    minimumSalePrice = 0,
    conversionFactor = 1,
    unitOfMeasure,
    lineCostFIFO = 0,
  } = itemData

  const rowMinimumPrice = useMemo(() => {
    return round2(minimumSalePrice * conversionFactor)
  }, [minimumSalePrice, conversionFactor])

  useEffect(() => {
    if (vatRateDetails) {
      const vatRate = vatRateDetails.rate || 0

      const lineValue = round2(watchedUnitPrice * quantity)
      const lineProfitCalc = round2(lineValue - lineCostFIFO)
      const lineMarginCalc =
        lineValue > 0 ? round2((lineProfitCalc / lineValue) * 100) : 0

      const calculatedVatValue = round2(lineValue * (vatRate / 100))
      const lineTotal = round2(lineValue + calculatedVatValue)

      setValue(`items.${index}.lineValue`, lineValue, { shouldDirty: true })
      setValue(`items.${index}.vatRateDetails.value`, calculatedVatValue, {
        shouldDirty: true,
      })
      setValue(`items.${index}.lineTotal`, lineTotal, { shouldDirty: true })
      setValue(`items.${index}.lineProfit`, lineProfitCalc, {
        shouldDirty: true,
      })
      setValue(`items.${index}.lineMargin`, lineMarginCalc, {
        shouldDirty: true,
      })
    }
   }, [
    watchedUnitPrice,
    quantity,
    vatRateDetails,
    index,
    setValue,
    lineCostFIFO,
  ])

  const lineValue = watch(`items.${index}.lineValue`) || 0
  const lineVatValue = watch(`items.${index}.vatRateDetails.value`) || 0
  const lineTotal = watch(`items.${index}.lineTotal`) || 0

  return (
    <TableRow>
      <TableCell className='w-[40px] text-center p-2 font-medium text-muted-foreground'>
        {index + 1}
      </TableCell>

      {/* 2. Produs (Nume) */}
      <TableCell className='font-medium w-full'>
        <p>{productName}</p>
        <p className='text-xs text-muted-foreground'>{productCode}</p>
        <LineProfitDisplay
          cost={lineCostFIFO}
          profit={lineProfit}
          margin={lineMargin}
        />
      </TableCell>

      {/* 3. Cantitate (BLOCAT) */}
      <TableCell className='w-[120px] text-right'>
        <span className='px-3'>{quantity}</span>
      </TableCell>

      {/* 4. Unitate de Măsură (BLOCAT) */}
      <TableCell className='w-[120px] text-center'>
        <span>{unitOfMeasure}</span>
      </TableCell>

      {/* 5. Preț Unitar (EDITABIL) */}
      <TableCell className='w-[120px]'>
        <Controller
          name={`items.${index}.unitPrice`}
          control={control}
          defaultValue={itemData.unitPrice}
          render={({ field }) => (
            <div className='relative pt-4'>
              {rowMinimumPrice > 0 && (
                <p className='absolute top-0 left-0 text-xs text-muted-foreground text-center w-full'>
                  Min: {formatCurrency(rowMinimumPrice)}
                </p>
              )}
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
                    if (numValue < rowMinimumPrice) {
                      numValue = rowMinimumPrice
                      toast.info(
                        `Prețul a fost ajustat la minimul de ${formatCurrency(
                          numValue
                        )}.`
                      )
                    }
                    field.onChange(numValue)
                  } else {
                    field.onChange(rowMinimumPrice)
                  }
                }}
                className='w-full text-right'
              />
            </div>
          )}
        />
      </TableCell>

      {/* 6. Valoare Fără TVA */}
      <TableCell className='w-[120px] text-right font-medium'>
        {formatCurrency(lineValue)}
      </TableCell>

      {/* 7. TVA % (BLOCAT) */}
      <TableCell className='w-[100px] text-center'>
        <span>{vatRateDetails?.rate || 0}%</span>
      </TableCell>

      {/* 8. Suma TVA */}
      <TableCell className='w-[100px] text-right text-sm'>
        {formatCurrency(lineVatValue)}
      </TableCell>

      {/* 9. Total Final (Cu TVA) */}
      <TableCell className='w-[150px] text-right font-semibold text-primary'>
        {formatCurrency(lineTotal)}
      </TableCell>
    </TableRow>
  )
}
