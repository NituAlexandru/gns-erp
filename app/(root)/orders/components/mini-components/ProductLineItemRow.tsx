'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { useFormContext, Controller, useWatch } from 'react-hook-form'
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
import { LockKeyhole, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUnitConversion } from '@/hooks/use-unit-conversion'
import { formatCurrency } from '@/lib/utils'
import { OrderLineItemRowProps } from './OrderLineItemRow'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type UnitOption = {
  unitName: string
  baseUnitEquivalent: number
}

interface ProductLineItemRowProps extends OrderLineItemRowProps {
  itemData: OrderLineItemInput
}

export function ProductLineItemRow({
  index,
  vatRates,
  remove,
  itemData,
  isAdmin,
}: ProductLineItemRowProps) {
  const { control, setValue, getValues } = useFormContext()
  const [isUmConfirmed, setIsUmConfirmed] = useState(false)

  const {
    productId,
    priceAtTimeOfOrder = 0,
    quantity = 0,
    vatRateDetails,
    productName,
    baseUnit,
    packagingOptions,
    minimumSalePrice = 0,
  } = itemData || {}

  const prevConversionFactor = useRef(1)

  const itemForHook = useMemo(
    () => ({
      _id: productId || '',
      unit: baseUnit || '',
      packagingOptions: packagingOptions || [],
    }),
    [productId, baseUnit, packagingOptions],
  )

  const { handleUnitChange, allUnits, convertedPrice, conversionFactor } =
    useUnitConversion({
      item: itemForHook,
      basePrice: minimumSalePrice || 0,
    })

  const unitOfMeasureFromForm = useWatch({
    control,
    name: `lineItems.${index}.unitOfMeasure`,
  })

  useEffect(() => {
    if (unitOfMeasureFromForm && handleUnitChange) {
      handleUnitChange(unitOfMeasureFromForm)
    }
  }, [unitOfMeasureFromForm, handleUnitChange])

  useEffect(() => {
    if (conversionFactor !== prevConversionFactor.current) {
      const path = `lineItems.${index}.priceAtTimeOfOrder` as const
      const currentPrice = Number(getValues(path) ?? 0)
      const prev = prevConversionFactor.current || 1
      const priceInBaseUnit = currentPrice / prev
      const nextFactor = conversionFactor || 1
      const newConvertedPrice = priceInBaseUnit * nextFactor
      const finalPrice = Number(newConvertedPrice.toFixed(2))
      setValue(path, finalPrice, { shouldDirty: true })
    }
    prevConversionFactor.current = conversionFactor || 1
  }, [conversionFactor, index, getValues, setValue, unitOfMeasureFromForm])

  useEffect(() => {
    if (!convertedPrice || convertedPrice <= 0) return
    const path = `lineItems.${index}.priceAtTimeOfOrder` as const
    const currentPrice = Number(getValues(path) ?? 0)
    const formattedMinPrice = Number(convertedPrice.toFixed(2))

    if (!isAdmin && currentPrice < formattedMinPrice) {
      setValue(path, formattedMinPrice, { shouldDirty: true })

      const selectedUnitFromForm = getValues(`lineItems.${index}.unitOfMeasure`)
      if (productName && selectedUnitFromForm) {
        toast.info(
          `Prețul pentru "${productName}" a fost ajustat la noul minim pentru ${selectedUnitFromForm}.`,
        )
      }
    }
  }, [
    convertedPrice,
    index,
    getValues,
    setValue,
    productName,
    isAdmin,
    unitOfMeasureFromForm,
  ])

  useEffect(() => {
    const vatRate = vatRateDetails?.rate || 0
    const lineSubtotal = priceAtTimeOfOrder * quantity
    const calculatedVatValue = Number(
      ((vatRate / 100) * lineSubtotal).toFixed(2),
    )

    if (vatRateDetails?.value !== calculatedVatValue) {
      setValue(`lineItems.${index}.vatRateDetails.value`, calculatedVatValue, {
        shouldDirty: true,
      })
    }
  }, [
    priceAtTimeOfOrder,
    quantity,
    vatRateDetails?.rate,
    vatRateDetails?.value,
    index,
    setValue,
  ])

  if (!productId || !baseUnit) {
    return null
  }

  const lineSubtotal = priceAtTimeOfOrder * quantity
  const lineVatValue = vatRateDetails?.value || 0
  const lineTotal = lineSubtotal + lineVatValue

  return (
    <TableRow>
      <TableCell className='font-medium w-full '>{productName}</TableCell>

      {/* --- COL CANTITATE --- */}
      <TableCell>
        <div className='relative w-full'>
          {!isUmConfirmed && (
            <div className='absolute bottom-full left-0 mb-1 w-full text-center text-[12px] font-bold text-destructive animate-pulse whitespace-nowrap pointer-events-none'>
              Confirmă U.M. →
            </div>
          )}

          <Controller
            name={`lineItems.${index}.quantity`}
            control={control}
            defaultValue={1}
            render={({ field }) => (
              <>
                <Input
                  {...field}
                  type='number'
                  disabled={!isUmConfirmed}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) field.onChange(val.toFixed(2))
                  }}
                  className={`min-w-[100px] ${!isUmConfirmed ? 'cursor-not-allowed bg-muted text-muted-foreground' : ''}`}
                />

                {!isUmConfirmed && (
                  <LockKeyhole className='absolute right-2 top-2.5 h-4 w-4 text-destructive opacity-70' />
                )}
              </>
            )}
          />
        </div>
      </TableCell>

      <TableCell className='w-[120px] py-3'>
        <Controller
          name={`lineItems.${index}.unitOfMeasure`}
          control={control}
          render={({ field, fieldState }) => (
            <div className='flex flex-col'>
              <Select
                onOpenChange={() => setIsUmConfirmed(true)}
                onValueChange={(value) => {
                  field.onChange(value)
                  handleUnitChange(value)
                  const code = getEFacturaUomCode(value)
                  setValue(`lineItems.${index}.unitOfMeasureCode`, code)
                  setIsUmConfirmed(true)
                }}
                value={field.value}
              >
                <SelectTrigger
                  className={`min-w-[100px] ${fieldState.invalid ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                >
                  <SelectValue placeholder='Selectează...' />
                </SelectTrigger>

                <SelectContent>
                  {(allUnits || []).map((unitOption: UnitOption) => (
                    <SelectItem
                      key={unitOption.unitName}
                      value={unitOption.unitName}
                    >
                      {unitOption.unitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* MODIFICAREA 3: Afișezi mesajul de eroare sub dropdown */}
              {fieldState.error && (
                <span className='text-[10px] text-red-500 font-medium mt-1'>
                  Selectează UM
                </span>
              )}
            </div>
          )}
        />
      </TableCell>

      <TableCell className='w-[150px]'>
        <Controller
          name={`lineItems.${index}.priceAtTimeOfOrder`}
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <div className='relative'>
              {convertedPrice > 0 && (
                <p className='absolute bottom-8 left-0 right-0 mb-1 text-center text-xs text-muted-foreground'>
                  Pret Minim:{' '}
                  <span className='font-bold text-primary'>
                    {formatCurrency(convertedPrice)}
                  </span>
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
                  const formattedMinPrice = Number(convertedPrice.toFixed(2))

                  if (!isNaN(numValue)) {
                    // MODIFICARE: Verificăm rolul
                    if (numValue < formattedMinPrice) {
                      if (isAdmin) {
                        // Daca e ADMIN -> Permitem, dar dăm un avertisment galben
                        toast.warning(
                          `Preț setat sub limita minimă (${formatCurrency(formattedMinPrice)}). Permis pentru Admin.`,
                        )
                      } else {
                        // Daca NU e Admin -> Resetăm la minim
                        numValue = formattedMinPrice
                        toast.info(
                          `Prețul a fost ajustat la minimul de ${formatCurrency(formattedMinPrice)}.`,
                        )
                      }
                    }
                    field.onChange(numValue.toFixed(2))
                  } else {
                    field.onChange(formattedMinPrice)
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
