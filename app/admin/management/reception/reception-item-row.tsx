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
import { VatRateDTO } from '@/lib/db/modules/vat-rate/types'

type ReceptionItemRowProps = {
  form: UseFormReturn<ReceptionCreateInput>
  index: number
  onRemove: () => void
  initialItemData?: { _id: string; name: string }
  distributedTransportCost: number
  vatRates: VatRateDTO[]
  isVatPayer: boolean
} & ({ itemType: 'products' } | { itemType: 'packagingItems' })

function convertBasePriceToDisplay(
  basePrice: number,
  unitMeasure: string,
  itemDetails: {
    unit: string
    packagingUnit?: string
    packagingQuantity?: number
    itemsPerPallet?: number
  }
): number {
  const { unit, packagingUnit, packagingQuantity, itemsPerPallet } = itemDetails

  // Dacă UM selectat este unitatea de bază, returnăm prețul de bază
  if (unitMeasure === unit) {
    return basePrice
  }

  // Dacă UM selectat este ambalajul și avem factor de conversie, calculăm
  if (unitMeasure === packagingUnit && packagingQuantity) {
    return basePrice * packagingQuantity
  }

  // Dacă UM selectat este paletul, calculăm prețul total pe palet
  if (unitMeasure === 'palet' && itemsPerPallet) {
    const totalBaseUnitsPerPallet = packagingQuantity
      ? itemsPerPallet * packagingQuantity
      : itemsPerPallet
    return basePrice * totalBaseUnitsPerPallet
  }

  // Fallback: returnăm prețul de bază dacă nu știm cum să convertim
  return basePrice
}

export function ReceptionItemRow(props: ReceptionItemRowProps) {
  const {
    form,
    itemType,
    index,
    onRemove,
    initialItemData,
    distributedTransportCost,
    vatRates,
    isVatPayer,
  } = props

  const {
    itemName,
    itemNamePath,
    quantityPath,
    unitMeasurePath,
    pricePath,
    vatRatePath,
  } =
    itemType === 'products'
      ? {
          itemName: 'product' as const,
          itemNamePath: `products.${index}.product` as const,
          quantityPath: `products.${index}.quantity` as const,
          unitMeasurePath: `products.${index}.unitMeasure` as const,
          pricePath: `products.${index}.invoicePricePerUnit` as const,
          vatRatePath: `products.${index}.vatRate` as const,
        }
      : {
          itemName: 'packaging' as const,
          itemNamePath: `packagingItems.${index}.packaging` as const,
          quantityPath: `packagingItems.${index}.quantity` as const,
          unitMeasurePath: `packagingItems.${index}.unitMeasure` as const,
          pricePath: `packagingItems.${index}.invoicePricePerUnit` as const,
          vatRatePath: `packagingItems.${index}.vatRate` as const,
        }

  const selectedItemId = form.watch(itemNamePath)
  const invoicePrice = form.watch(pricePath)
  const quantity = form.watch(quantityPath)
  const selectedUM = form.watch(unitMeasurePath)

  const [lastPrice, setLastPrice] = useState<number | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [priceNotFound, setPriceNotFound] = useState(false)
  const [itemDetails, setItemDetails] = useState<SearchResult | null>(null)

  useEffect(() => {
    if (initialItemData) {
      setItemDetails(initialItemData)
    }
  }, [initialItemData])

  useEffect(() => {
    if (!selectedItemId) return

    setIsLoadingPrice(true)
    setLastPrice(null)
    setPriceNotFound(false)

    // Alege ruta în funcție de itemType
    const url =
      itemType === 'products'
        ? `/api/admin/management/receptions/last-price/${selectedItemId}`
        : `/api/admin/management/receptions/last-price-packaging/${selectedItemId}`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setIsLoadingPrice(false)
        if (typeof data.price === 'number') {
          setLastPrice(data.price)
        } else {
          setPriceNotFound(true)
        }
      })
      .catch(() => {
        setIsLoadingPrice(false)
        setPriceNotFound(true)
      })
  }, [selectedItemId, itemType])

  const priceDifferencePercentage = useMemo(() => {
    if (
      lastPrice === null || // lastPrice este garantat a fi prețul de bază
      lastPrice === 0 ||
      typeof invoicePrice !== 'number' ||
      !itemDetails ||
      !selectedUM
    ) {
      return null
    }

    const { unit, packagingUnit, packagingQuantity, itemsPerPallet } =
      itemDetails

    // Calculăm prețul de bază pentru prețul curent introdus
    let currentPricePerBaseUnit = 0
    switch (selectedUM) {
      case unit:
        currentPricePerBaseUnit = invoicePrice
        break
      case packagingUnit:
        if (!packagingQuantity) return null
        currentPricePerBaseUnit = invoicePrice / packagingQuantity
        break
      case 'palet':
        if (!itemsPerPallet || itemsPerPallet <= 0) {
          return null
        }

        const totalBaseUnits = (packagingQuantity ?? 1) * itemsPerPallet
        if (totalBaseUnits === 0) return null
        currentPricePerBaseUnit = invoicePrice / totalBaseUnits
        break
      default:
        return null
    }

    if (isNaN(currentPricePerBaseUnit) || !isFinite(currentPricePerBaseUnit)) {
      return null
    }

    const difference = ((currentPricePerBaseUnit - lastPrice) / lastPrice) * 100

    return Math.abs(difference) < 0.01 ? null : difference
  }, [invoicePrice, lastPrice, selectedUM, itemDetails])

  const calculatedValues = useMemo(() => {
    if (
      !itemDetails ||
      !quantity ||
      !selectedUM ||
      typeof invoicePrice !== 'number'
    ) {
      return null
    }

    const { unit, packagingUnit, packagingQuantity, itemsPerPallet } =
      itemDetails
    const totalBaseUnitsPerPallet =
      itemsPerPallet && itemsPerPallet > 0
        ? packagingQuantity
          ? itemsPerPallet * packagingQuantity
          : itemsPerPallet
        : 0

    let baseQuantity = 0
    let invoicePricePerBaseUnit = 0

    switch (selectedUM) {
      case unit:
        baseQuantity = quantity
        invoicePricePerBaseUnit = invoicePrice
        break
      case packagingUnit:
        if (!packagingQuantity) return null
        baseQuantity = quantity * packagingQuantity
        invoicePricePerBaseUnit = invoicePrice / packagingQuantity
        break
      case 'palet':
        if (totalBaseUnitsPerPallet <= 0) return null
        baseQuantity = quantity * totalBaseUnitsPerPallet
        invoicePricePerBaseUnit = invoicePrice / totalBaseUnitsPerPallet
        break
      default:
        return null
    }

    if (
      isNaN(invoicePricePerBaseUnit) ||
      !isFinite(invoicePricePerBaseUnit) ||
      baseQuantity === 0
    ) {
      return null
    }

    const invoicePricePerPackagingUnit = packagingQuantity
      ? invoicePricePerBaseUnit * packagingQuantity
      : null
    const invoicePricePerPallet =
      totalBaseUnitsPerPallet > 0
        ? invoicePricePerBaseUnit * totalBaseUnitsPerPallet
        : null
    const invoiceTotalPrice = quantity * invoicePrice

    const transportCostPerBaseUnit = distributedTransportCost / baseQuantity
    const landedCostPerBaseUnit =
      invoicePricePerBaseUnit + transportCostPerBaseUnit
    const landedCostPerPackagingUnit = packagingQuantity
      ? landedCostPerBaseUnit * packagingQuantity
      : null
    const landedCostPerPallet =
      totalBaseUnitsPerPallet > 0
        ? landedCostPerBaseUnit * totalBaseUnitsPerPallet
        : null
    const landedTotalPrice = invoiceTotalPrice + distributedTransportCost

    const totalPackagingUnit = packagingQuantity
      ? baseQuantity / packagingQuantity
      : null
    const totalPallets =
      totalBaseUnitsPerPallet > 0
        ? baseQuantity / totalBaseUnitsPerPallet
        : null

    return {
      totalBase: baseQuantity.toFixed(2),
      totalPackaging: totalPackagingUnit ? totalPackagingUnit.toFixed(2) : null,
      totalPallets: totalPallets ? totalPallets.toFixed(2) : null,
      invoicePricePerBaseUnit,
      invoicePricePerPackagingUnit,
      invoicePricePerPallet,
      landedCostPerBaseUnit,
      landedCostPerPackagingUnit,
      landedCostPerPallet,
      invoiceTotalPrice,
      landedTotalPrice,
    }
  }, [
    quantity,
    selectedUM,
    invoicePrice,
    itemDetails,
    distributedTransportCost,
  ])

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
                  {itemName === 'product' ? 'Produs' : 'Ambalaj'} <span>*</span>
                </div>
                <div className='text-right text-xs'>
                  {isLoadingPrice ? (
                    <p className='mt-1 text-muted-foreground animate-pulse'>
                      Se verifică...
                    </p>
                  ) : priceNotFound ? (
                    <p className='mt-1 text-amber-600 font-medium'>
                      Nu există recepții anterioare pentru acest articol
                    </p>
                  ) : lastPrice !== null && itemDetails && selectedUM ? (
                    <>
                      <div className=' text-muted-foreground flex justify-center align-middle gap-2'>
                        Ultimul preț:{' '}
                        {formatCurrency(
                          convertBasePriceToDisplay(lastPrice, selectedUM, {
                            unit: itemDetails.unit!,
                            packagingUnit: itemDetails.packagingUnit,
                            packagingQuantity: itemDetails.packagingQuantity,
                            itemsPerPallet: itemDetails.itemsPerPallet,
                          })
                        )}{' '}
                        / {selectedUM}{' '}
                        {priceDifferencePercentage != null && (
                          <div
                            className={cn(
                              ' font-semibold',
                              priceDifferencePercentage > 0
                                ? 'text-red-500'
                                : 'text-green-600'
                            )}
                          >
                            {priceDifferencePercentage > 0 ? '+' : ''}
                            {priceDifferencePercentage.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
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
                Cantitate <span>*</span>
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
                UM <span>*</span>
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
                Preț intrare (fără TVA) <span>*</span>
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
        {isVatPayer && (
          <FormField
            name={vatRatePath}
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>TVA</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='TVA...' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vatRates.map((rate) => (
                      <SelectItem key={rate._id} value={rate.rate.toString()}>
                        {rate.rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}

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
          {/* Cantități totale */}
          <div>
            <div className='font-semibold text-foreground mb-1 flex justify-between'>
              <span>Cantități Totale:</span>
              <div className='text-xs font-normal text-muted-foreground space-x-3'>
                {itemDetails.packagingQuantity && itemDetails.packagingUnit && (
                  <span>
                    (1 {itemDetails.packagingUnit} ={' '}
                    {itemDetails.packagingQuantity} {itemDetails.unit})
                  </span>
                )}
                {itemDetails.itemsPerPallet && (
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
              {calculatedValues.totalPackaging != null && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>
                    Total {itemDetails.packagingUnit}
                  </div>
                  <div className='font-bold'>
                    {calculatedValues.totalPackaging}
                  </div>
                </div>
              )}
              {calculatedValues.totalPallets != null && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>Total palet</div>
                  <div className='font-bold'>
                    {calculatedValues.totalPallets}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prețuri & costuri */}
          <div>
            <div className='font-semibold text-foreground mb-1 flex justify-between'>
              <span>Prețuri & Costuri:</span>
              <div className='text-right'>
                <div className='font-normal text-sm text-muted-foreground'>
                  Valoare Factură:{' '}
                  <span className='font-medium'>
                    {formatCurrency(calculatedValues.invoiceTotalPrice)}
                  </span>
                </div>{' '}
                {itemType === 'products' ? (
                  <div className='font-bold text-lg text-primary'>
                    Valoare cu Transport:
                    {formatCurrency(calculatedValues.landedTotalPrice)}
                  </div>
                ) : (
                  <div className='font-semibold text-sm text-muted-foreground italic'>
                    Costul de transport nu se aplică pentru ambalaje.
                  </div>
                )}
              </div>
            </div>
            <div className='grid grid-cols-3 gap-2 text-center'>
              {/* Bază */}
              <div className='space-y-1'>
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>
                    Preț / {itemDetails.unit}
                  </div>
                  <div className='font-bold'>
                    {formatCurrency(calculatedValues.invoicePricePerBaseUnit)}
                  </div>
                </div>
                <div className='rounded bg-lime-950 p-1'>
                  <div className='text-lime-400'>Cost / {itemDetails.unit}</div>
                  <div className='font-bold text-white'>
                    {formatCurrency(calculatedValues.landedCostPerBaseUnit)}
                  </div>
                </div>
              </div>

              {/* Ambalaj */}
              {itemDetails.packagingUnit && (
                <div className='space-y-1'>
                  <div className='rounded bg-background p-1'>
                    <div className='text-muted-foreground'>
                      Preț / {itemDetails.packagingUnit}
                    </div>
                    <div className='font-bold'>
                      {formatCurrency(
                        calculatedValues.invoicePricePerPackagingUnit!
                      )}
                    </div>
                  </div>
                  <div className='rounded bg-lime-950 p-1'>
                    <div className='text-lime-400'>
                      Cost / {itemDetails.packagingUnit}
                    </div>
                    <div className='font-bold text-white'>
                      {formatCurrency(
                        calculatedValues.landedCostPerPackagingUnit!
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Palet */}
              {itemDetails.itemsPerPallet && (
                <div className='space-y-1'>
                  <div className='rounded bg-background p-1'>
                    <div className='text-muted-foreground'>Preț / palet</div>
                    <div className='font-bold'>
                      {formatCurrency(calculatedValues.invoicePricePerPallet!)}
                    </div>
                  </div>
                  <div className='rounded bg-lime-950 p-1'>
                    <div className='text-lime-400'>Cost / palet</div>
                    <div className='font-bold text-white'>
                      {formatCurrency(calculatedValues.landedCostPerPallet!)}
                    </div>
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
