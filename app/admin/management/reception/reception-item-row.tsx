'use client'

import { type UseFormReturn } from 'react-hook-form'
import { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import { ReceptionCreateInput } from '@/lib/db/modules/reception/types'
import { AutocompleteSearch, type SearchResult } from './autocomplete-search'

type ReceptionItemRowProps = {
  form: UseFormReturn<ReceptionCreateInput>
  index: number
  onRemove: () => void
  initialItemData?: { _id: string; name: string }
} & ({ itemType: 'products' } | { itemType: 'packagingItems' })

export function ReceptionItemRow(props: ReceptionItemRowProps) {
  const { form, itemType, index, onRemove, initialItemData } = props

  const { itemName, itemNamePath, quantityPath, unitMeasurePath, pricePath } =
    itemType === 'products'
      ? {
          itemName: 'product' as const,
          itemNamePath: `products.${index}.product` as const,
          quantityPath: `products.${index}.quantity` as const,
          unitMeasurePath: `products.${index}.unitMeasure` as const,
          pricePath: `products.${index}.priceAtReception` as const,
        }
      : {
          itemName: 'packaging' as const,
          itemNamePath: `packagingItems.${index}.packaging` as const,
          quantityPath: `packagingItems.${index}.quantity` as const,
          unitMeasurePath: `packagingItems.${index}.unitMeasure` as const,
          pricePath: `packagingItems.${index}.priceAtReception` as const,
        }

  const selectedItemId = form.watch(itemNamePath)
  const currentPrice = form.watch(pricePath)
  const quantity = form.watch(quantityPath)
  const selectedUM = form.watch(unitMeasurePath)

  const [lastPrice, setLastPrice] = useState<number | null>(null)
  const [itemDetails, setItemDetails] = useState<SearchResult | null>(null)

  useEffect(() => {
    if (initialItemData) {
      setItemDetails(initialItemData)
    }
  }, [initialItemData])

  useEffect(() => {
    if (selectedItemId) {
      fetch(`/api/admin/products/${selectedItemId}/last-price`)
        .then((res) => res.json())
        .then((data) => setLastPrice(data.price || null))
        .catch((err) => console.error('Failed to fetch last price:', err))
    } else {
      setLastPrice(null)
      setItemDetails(null)
    }
  }, [selectedItemId])

  const priceDifferencePercentage = useMemo(() => {
    if (
      lastPrice === null ||
      lastPrice === 0 ||
      typeof currentPrice !== 'number' || // Verificare explicită pentru număr
      !itemDetails ||
      !selectedUM
    ) {
      return null
    }

    let currentPricePerBaseUnit = 0
    const { unit, packagingUnit, packagingQuantity, itemsPerPallet } =
      itemDetails

    if (selectedUM === unit) {
      currentPricePerBaseUnit = currentPrice
    } else if (selectedUM === packagingUnit && packagingQuantity) {
      currentPricePerBaseUnit = currentPrice / packagingQuantity
    } else if (selectedUM === 'palet' && itemsPerPallet) {
      const pricePerPackage = currentPrice / itemsPerPallet
      currentPricePerBaseUnit = packagingQuantity
        ? pricePerPackage / packagingQuantity
        : pricePerPackage
    }

    if (isNaN(currentPricePerBaseUnit) || !isFinite(currentPricePerBaseUnit)) {
      return null
    }

    const difference = ((currentPricePerBaseUnit - lastPrice) / lastPrice) * 100

    if (Math.abs(difference) < 0.01) {
      return null
    }

    return difference
  }, [currentPrice, lastPrice, selectedUM, itemDetails])

  const calculatedValues = useMemo(() => {
    if (
      !itemDetails ||
      !quantity ||
      !selectedUM ||
      typeof currentPrice !== 'number' // Verificare explicită pentru număr
    ) {
      return null
    }

    const { unit, packagingUnit, packagingQuantity, itemsPerPallet } =
      itemDetails

    let pricePerBaseUnit = 0
    if (selectedUM === unit) {
      pricePerBaseUnit = currentPrice
    } else if (selectedUM === packagingUnit && packagingQuantity) {
      pricePerBaseUnit = currentPrice / packagingQuantity
    } else if (selectedUM === 'palet' && itemsPerPallet) {
      const pricePerPackage = currentPrice / itemsPerPallet
      pricePerBaseUnit = packagingQuantity
        ? pricePerPackage / packagingQuantity
        : pricePerPackage
    }

    if (isNaN(pricePerBaseUnit) || !isFinite(pricePerBaseUnit)) {
      return null
    }

    const pricePerPackagingUnit = packagingQuantity
      ? pricePerBaseUnit * packagingQuantity
      : null
    const pricePerPallet =
      itemsPerPallet && itemsPerPallet > 0 && pricePerPackagingUnit
        ? pricePerPackagingUnit * itemsPerPallet
        : itemsPerPallet && itemsPerPallet > 0
          ? pricePerBaseUnit * itemsPerPallet
          : null

    let totalBaseUnit = 0
    if (selectedUM === unit) {
      totalBaseUnit = quantity
    } else if (selectedUM === packagingUnit && packagingQuantity) {
      totalBaseUnit = quantity * packagingQuantity
    } else if (selectedUM === 'palet' && itemsPerPallet) {
      const totalPackages = quantity * itemsPerPallet
      totalBaseUnit = packagingQuantity
        ? totalPackages * packagingQuantity
        : totalPackages
    }

    const totalPackagingUnit = packagingQuantity
      ? totalBaseUnit / packagingQuantity
      : null
    const totalPallets =
      itemsPerPallet && itemsPerPallet > 0 && totalPackagingUnit
        ? totalPackagingUnit / itemsPerPallet
        : itemsPerPallet && itemsPerPallet > 0
          ? totalBaseUnit / itemsPerPallet
          : null
    const totalPrice = quantity * currentPrice

    return {
      totalBase: totalBaseUnit.toFixed(2),
      totalPackaging: totalPackagingUnit ? totalPackagingUnit.toFixed(2) : null,
      totalPallets: totalPallets ? totalPallets.toFixed(2) : null,
      priceBase: pricePerBaseUnit,
      pricePackaging: pricePerPackagingUnit,
      pricePallet: pricePerPallet,
      totalPrice: totalPrice,
    }
  }, [quantity, selectedUM, currentPrice, itemDetails])

  const uniqueUmOptions = useMemo(() => {
    if (!itemDetails) return []
    const options = new Set<string>()
    if (itemDetails.unit) options.add(itemDetails.unit)
    if (itemDetails.packagingUnit) options.add(itemDetails.packagingUnit)
    if (itemDetails.itemsPerPallet && itemDetails.itemsPerPallet > 0)
      options.add('palet')
    return Array.from(options)
  }, [itemDetails])

  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 mb-3'>
      <div className='w-full'>
        <FormField
          name={itemNamePath}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className='flex justify-between items-center'>
                <div>
                  {itemName === 'product' ? 'Produs' : 'Ambalaj'}{' '}
                  <span className='text-red-500'>*</span>
                </div>
                {lastPrice !== null && (
                  <p className=' mt-1 text-muted-foreground text-xs'>
                    Ultimul preț de receptie: {formatCurrency(lastPrice)} /{' '}
                    {itemDetails?.unit}
                  </p>
                )}
                <div>
                  {' '}
                  {priceDifferencePercentage !== null && (
                    <p
                      className={cn(
                        'text-xs mt-1 text-right',
                        priceDifferencePercentage > 0
                          ? 'text-red-500'
                          : 'text-green-600'
                      )}
                    >
                      {priceDifferencePercentage > 0 ? '+' : ''}
                      {priceDifferencePercentage.toFixed(2)}% față de ultimul
                      preț
                    </p>
                  )}
                </div>
              </FormLabel>
              <AutocompleteSearch
                searchType={itemName}
                value={field.value}
                initialSelectedItem={initialItemData}
                onChange={(id, item) => {
                  form.setValue(itemNamePath, id, { shouldValidate: true })
                  if (item?.unit) {
                    form.setValue(unitMeasurePath, item.unit, {
                      shouldValidate: true,
                    })
                  }
                  setItemDetails(item || null)
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className='flex items-end gap-2'>
        <FormField
          name={quantityPath}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Cantitate <span className='text-red-500'>*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === '' ? '' : parseFloat(e.target.value)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={unitMeasurePath}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                UM <span className='text-red-500'>*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!itemDetails}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Alege UM' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {uniqueUmOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={pricePath}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Preț intrare <span className='text-red-500'>*</span>{' '}
              </FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === '' ? null : parseFloat(e.target.value)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='button'
          size='icon'
          variant='ghost'
          onClick={onRemove}
          className='flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>

      {calculatedValues && itemDetails && (
        <div className='mt-2 space-y-3 border-t pt-2 text-xs'>
          <div>
            <div className='font-semibold text-foreground mb-1 flex justify-between items-baseline'>
              <span>Cantități Totale:</span>
              <div className='text-xs font-normal text-muted-foreground space-x-3'>
                {itemDetails.packagingQuantity && itemDetails.packagingUnit && (
                  <span>
                    (1 {itemDetails.packagingUnit} ={' '}
                    {itemDetails.packagingQuantity} {itemDetails.unit})
                  </span>
                )}
                {itemDetails.itemsPerPallet &&
                  itemDetails.itemsPerPallet > 0 && (
                    <span>
                      (1 palet = {itemDetails.itemsPerPallet}{' '}
                      {itemDetails.packagingUnit || itemDetails.unit})
                    </span>
                  )}
              </div>
            </div>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div className='rounded bg-background p-1'>
                <div className='text-muted-foreground'>
                  Total {itemDetails.unit}
                </div>
                <div className='font-bold'>{calculatedValues.totalBase}</div>
              </div>
              {calculatedValues.totalPackaging && itemDetails.packagingUnit && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>
                    Total {itemDetails.packagingUnit}
                  </div>
                  <div className='font-bold'>
                    {calculatedValues.totalPackaging}
                  </div>
                </div>
              )}
              {calculatedValues.totalPallets && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>Total palet</div>
                  <div className='font-bold'>
                    {calculatedValues.totalPallets}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className='font-semibold text-foreground mb-1 flex items-center gap-3 justify-between'>
              <div>Prețuri Echivalente:</div>
              <div className='rounded text-center'>
                <div className='font-bold text-lg text-muted-foreground'>
                  Valoare Totală: {formatCurrency(calculatedValues.totalPrice)}
                </div>
              </div>
            </div>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div className='rounded bg-background p-1'>
                <div className='text-muted-foreground'>
                  Preț / {itemDetails.unit}
                </div>
                <div className='font-bold'>
                  {formatCurrency(calculatedValues.priceBase)}
                </div>
              </div>
              {calculatedValues.pricePackaging && itemDetails.packagingUnit && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>
                    Preț / {itemDetails.packagingUnit}
                  </div>
                  <div className='font-bold'>
                    {formatCurrency(calculatedValues.pricePackaging)}
                  </div>
                </div>
              )}
              {calculatedValues.pricePallet && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>Preț / palet</div>
                  <div className='font-bold'>
                    {formatCurrency(calculatedValues.pricePallet)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
