'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
import { Trash2 } from 'lucide-react'
import { calculateMinimumPrice } from '@/lib/db/modules/product/product.actions'
import { toast } from 'sonner'
import { useUnitConversion } from '@/hooks/use-unit-conversion'
import { formatCurrency } from '@/lib/utils'
import { OrderLineItemRowProps } from './OrderLineItemRow'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'

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
}: ProductLineItemRowProps) {
  const { control, setValue, getValues } = useFormContext()
  const deliveryType = useWatch({ control, name: 'deliveryType' })

  const {
    productId,
    priceAtTimeOfOrder = 0,
    quantity = 0,
    vatRateDetails,
    productName,
    baseUnit,
    packagingOptions,
  } = itemData || {}

  const [baseMinimumPrice, setBaseMinimumPrice] = useState<number | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const prevConversionFactor = useRef(1)

  const itemForHook = useMemo(
    () => ({
      _id: productId || '',
      unit: baseUnit || '',
      packagingOptions: packagingOptions || [],
    }),
    [productId, baseUnit, packagingOptions]
  )

  const { handleUnitChange, allUnits, convertedPrice, conversionFactor } =
    useUnitConversion({
      item: itemForHook,
      basePrice: baseMinimumPrice || 0,
    })

  useEffect(() => {
    if (!productId || !deliveryType) return
    let cancelled = false
    ;(async () => {
      setIsLoadingPrice(true)
      try {
        const newBaseMinPrice = await calculateMinimumPrice(
          productId,
          deliveryType
        )
        if (!cancelled) setBaseMinimumPrice(newBaseMinPrice)
      } catch (error) {
        console.error('Eroare la preluarea prețului de bază:', error)
      } finally {
        if (!cancelled) setIsLoadingPrice(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deliveryType, productId])

  useEffect(() => {
    if (
      conversionFactor !== prevConversionFactor.current &&
      prevConversionFactor.current !== 1
    ) {
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
  }, [conversionFactor, index, getValues, setValue])

  useEffect(() => {
    if (!convertedPrice || convertedPrice <= 0) return
    const path = `lineItems.${index}.priceAtTimeOfOrder` as const
    const minPricePath = `lineItems.${index}.minimumSalePrice` as const
    const currentPrice = Number(getValues(path) ?? 0)
    const formattedMinPrice = Number(convertedPrice.toFixed(2))

    setValue(minPricePath, formattedMinPrice, { shouldDirty: true })

    if (currentPrice < formattedMinPrice) {
      setValue(path, formattedMinPrice, { shouldDirty: true })

      const selectedUnitFromForm = getValues(`lineItems.${index}.unitOfMeasure`)
      if (productName && selectedUnitFromForm) {
        toast.info(
          `Prețul pentru "${productName}" a fost ajustat la noul minim pentru ${selectedUnitFromForm}.`
        )
      }
    }
  }, [convertedPrice, index, getValues, setValue, productName])

  useEffect(() => {
    const vatRate = vatRateDetails?.rate || 0
    const lineSubtotal = priceAtTimeOfOrder * quantity
    const calculatedVatValue = Number(
      ((vatRate / 100) * lineSubtotal).toFixed(2)
    )

    // Condiție de oprire: actualizăm starea DOAR dacă valoarea calculată este diferită
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

      <TableCell className='w-[120px] py-3'>
        <Controller
          name={`lineItems.${index}.unitOfMeasure`}
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => {
                field.onChange(value) // Actualizează starea formularului
                handleUnitChange(value) // Actualizează starea hook-ului de conversie
              }}
              value={field.value}
            >
              <SelectTrigger className='min-w-[100px]'>
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
              {(isLoadingPrice || convertedPrice > 0) && (
                <p className='absolute bottom-8 left-0 right-0 mb-1 text-center text-xs text-muted-foreground'>
                  {isLoadingPrice ? (
                    'Calculare...'
                  ) : (
                    <>
                      Pret Minim:{' '}
                      <span className='font-bold text-primary'>
                        {formatCurrency(convertedPrice)}
                      </span>
                    </>
                  )}
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
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue)) {
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
