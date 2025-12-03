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
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface InvoiceFormProductRowProps {
  index: number
  itemData: InvoiceLineInput
  remove: (index: number) => void
  isVatDisabled: boolean
}

export function InvoiceFormProductRow({
  index,
  itemData,
  remove,
  isVatDisabled,
}: InvoiceFormProductRowProps) {
  const { control, setValue, watch } = useFormContext<InvoiceInput>()
  const watchedInvoiceType = watch('invoiceType')
  const isStornoRow = watchedInvoiceType === 'STORNO'
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
            render={({ field }) =>
              isStornoRow ? (
                <div className='flex items-center relative'>
                  {/* Prefix vizual "-" */}
                  <span className='absolute left-2 text-muted-foreground font-bold'>
                    -
                  </span>

                  <Input
                    {...field}
                    type='number'
                    step='any'
                    // 1. Afișăm valoarea ABSOLUTĂ (pozitivă) ca userul să nu vadă "--5"
                    value={field.value ? Math.abs(field.value) : ''}
                    onChange={(e) => {
                      const positiveVal = parseFloat(e.target.value)
                      // 2. Salvăm întotdeauna valoarea NEGATIVĂ
                      if (!isNaN(positiveVal)) {
                        field.onChange(-Math.abs(positiveVal))
                      } else {
                        field.onChange(0)
                      }
                    }}
                    onBlur={(e) => {
                      const positiveVal = parseFloat(e.target.value)
                      const originalQtyAbs = Math.abs(itemData.quantity) // ex: |-10| = 10

                      if (isNaN(positiveVal)) {
                        field.onChange(itemData.quantity) // Reset la valoarea inițială
                        return
                      }

                      // Validare: nu poți returna mai mult decât a fost facturat
                      if (positiveVal > originalQtyAbs) {
                        toast.error(
                          `Nu poți stornare mai mult (${positiveVal}) decât factura originală (${originalQtyAbs}).`
                        )
                        field.onChange(itemData.quantity) // Reset la maximul permis
                      } else {
                        // Confirmăm salvarea cu minus
                        field.onChange(-Math.abs(positiveVal))
                      }
                    }}
                    className='w-full text-right pl-6' // Padding stânga ca să facem loc simbolului minus
                  />
                </div>
              ) : (
                // Dacă NU e storno (e standard sau avans), afișăm doar text, nu input (logică veche)
                <div className='text-right px-3 py-2'>
                  <span>{quantity}</span>
                </div>
              )
            }
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
        <span
          className={isVatDisabled ? 'text-muted-foreground opacity-50' : ''}
        >
          {vatRateDetails?.rate || 0}%{' '}
        </span>
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
        {isStornoRow && ( // <-- Condiția este VITALĂ
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='text-destructive hover:text-destructive'
            onClick={() => remove(index)}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
