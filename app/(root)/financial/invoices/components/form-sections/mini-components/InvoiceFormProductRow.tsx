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
  const watchedInvoiceType = watch('invoiceType')
  const watchedUnitPrice = watch(`items.${index}.unitPrice`, itemData.unitPrice)
  const watchedQuantity = watch(`items.${index}.quantity`, itemData.quantity)
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
    return round2(minimumSalePrice * conversionFactor || 1)
  }, [minimumSalePrice, conversionFactor])

  useEffect(() => {
    if (vatRateDetails) {
      const vatRate = vatRateDetails.rate || 0

      const lineValue = round2(watchedUnitPrice * watchedQuantity) 
      // Recalculează costul proporțional

      const originalQty = itemData.quantity // ex: -5
      const originalCost = itemData.lineCostFIFO || 0 // ex: -6499.50

      // Găsim costul unitar (negativ sau pozitiv)
      // (-6499.50 / -5) = 1299.9
      const unitCost = originalQty !== 0 ? originalCost / originalQty : 0

      // Noul cost (1299.9 * -2) = -2599.8
      const lineCostFIFOCalc = round2(unitCost * watchedQuantity)

      const lineProfitCalc = round2(lineValue - lineCostFIFOCalc)

      const lineMarginCalc =
        lineValue !== 0 ? round2((lineProfitCalc / lineValue) * 100) : 0 // Verifică lineValue e diferit de 0

      const calculatedVatValue = round2(lineValue * (vatRate / 100))
      const lineTotal = round2(lineValue + calculatedVatValue)

      setValue(`items.${index}.lineValue`, lineValue, { shouldDirty: true })
      setValue(`items.${index}.vatRateDetails.value`, calculatedVatValue, {
        shouldDirty: true,
      })
      setValue(`items.${index}.lineTotal`, lineTotal, { shouldDirty: true })
      setValue(`items.${index}.lineCostFIFO`, lineCostFIFOCalc, {
        shouldDirty: true,
      })
      setValue(`items.${index}.lineProfit`, lineProfitCalc, {
        shouldDirty: true,
      })
      setValue(`items.${index}.lineMargin`, lineMarginCalc, {
        shouldDirty: true,
      })
    }
  }, [
    watchedUnitPrice,
    watchedQuantity, 
    vatRateDetails,
    itemData.quantity, 
    itemData.lineCostFIFO, 
    index,
    setValue,
  ])

  const lineValue = watch(`items.${index}.lineValue`) || 0
  const isStornoRow = watchedInvoiceType === 'STORNO'
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
        {!isStornoRow && (
          <LineProfitDisplay
            cost={lineCostFIFO}
            profit={lineProfit}
            margin={lineMargin}
          />
        )}
      </TableCell>
      {/* 3. Cantitate (Span pt Standard, Input pt Storno) */}
      <TableCell className='w-[120px]'>
        {isStornoRow ? (
          // --- CAZ STORNO (EDITABIL) ---
          <Controller
            name={`items.${index}.quantity`}
            control={control}
            defaultValue={itemData.quantity}
            render={({ field }) => (
              <Input
                {...field}
                type='number'
                step='any' // 'disabled' nu mai e necesar, e controlat de 'isStornoRow'
                onChange={(e) =>
                  field.onChange(parseFloat(e.target.value) || 0)
                }
                onBlur={(e) => {
                  const numValue = parseFloat(e.target.value)
                  const originalQty = itemData.quantity // ex: -10

                  if (isNaN(numValue)) {
                    field.onChange(originalQty) // Resetează
                    return
                  }

                  if (numValue > 0) {
                    toast.error('Cantitatea stornată trebuie să fie negativă.')
                    field.onChange(originalQty)
                  } else if (numValue < originalQty) {
                    toast.error(
                      `Nu poți stornare mai mult (${numValue}) decât factura originală (${originalQty}).`
                    )
                    field.onChange(originalQty)
                  } else {
                    // Salvează valoarea parțială (ex: -2)
                    field.onChange(numValue)
                  }
                }}
                className='w-full text-right'
              />
            )}
          />
        ) : (
          // --- CAZ STANDARD/AVANS (BLOCAT) ---
          <div className='text-right px-3 py-2'>
            <span>{quantity}</span>
          </div>
        )}
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
            <div className='relative '>
              {!isStornoRow && rowMinimumPrice > 0 && (
                <p className='absolute bottom-9 left-0 text-xs text-muted-foreground text-center w-full'>
                  Min: {formatCurrency(rowMinimumPrice)}
                </p>
              )}
              <Input
                {...field}
                type='number'
                step='0.01'
                disabled={isStornoRow}
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
