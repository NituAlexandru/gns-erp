'use client'

import { UseFormReturn, Path } from 'react-hook-form' // Importăm Path doar pentru type-casting intern
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
import { SupplierOrderCreateInput } from '@/lib/db/modules/supplier-orders/supplier-order.validator'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  AutocompleteSearch,
  SearchResult,
} from '../../reception/autocomplete-search'

type SupplierOrderItemRowProps = {
  form: UseFormReturn<SupplierOrderCreateInput>
  index: number
  onRemove: () => void
  initialItemData?: SearchResult
  vatRates: VatRateDTO[]
  itemType: 'products' | 'packagingItems'
}

function convertBasePriceToDisplay(
  basePrice: number,
  unitMeasure: string,
  itemDetails: {
    unit?: string
    packagingUnit?: string
    packagingQuantity?: number
    itemsPerPallet?: number
  }
): number {
  const { unit, packagingUnit, packagingQuantity, itemsPerPallet } = itemDetails

  if (unit && unitMeasure === unit) return basePrice
  if (packagingUnit && unitMeasure === packagingUnit && packagingQuantity)
    return basePrice * packagingQuantity
  if (unitMeasure === 'palet' && itemsPerPallet) {
    const totalBaseUnitsPerPallet = packagingQuantity
      ? itemsPerPallet * packagingQuantity
      : itemsPerPallet
    return basePrice * totalBaseUnitsPerPallet
  }
  return basePrice
}

export function SupplierOrderItemRow(props: SupplierOrderItemRowProps) {
  const { form, index, onRemove, initialItemData, vatRates, itemType } = props

  const {
    itemNamePath,
    quantityPath,
    unitMeasurePath,
    pricePath,
    vatRatePath,
    originalQuantityPath,
    originalUMPath,
    originalPricePath,
    namePath,
    codePath,
  } =
    itemType === 'products'
      ? {
          itemNamePath: `products.${index}.product` as const,
          quantityPath: `products.${index}.quantityOrdered` as const,
          unitMeasurePath: `products.${index}.unitMeasure` as const,
          pricePath: `products.${index}.pricePerUnit` as const,
          vatRatePath: `products.${index}.vatRate` as const,
          // Căile UI
          originalQuantityPath: `products.${index}.originalQuantity` as const,
          originalUMPath: `products.${index}.originalUnitMeasure` as const,
          originalPricePath: `products.${index}.originalPricePerUnit` as const,
          // Hidden fields (Castăm explicit la Path pentru a evita any în setValue)
          namePath:
            `products.${index}.productName` as Path<SupplierOrderCreateInput>,
          codePath:
            `products.${index}.productCode` as Path<SupplierOrderCreateInput>,
        }
      : {
          itemNamePath: `packagingItems.${index}.packaging` as const,
          quantityPath: `packagingItems.${index}.quantityOrdered` as const,
          unitMeasurePath: `packagingItems.${index}.unitMeasure` as const,
          pricePath: `packagingItems.${index}.pricePerUnit` as const,
          vatRatePath: `packagingItems.${index}.vatRate` as const,
          // Căile UI
          originalQuantityPath:
            `packagingItems.${index}.originalQuantity` as const,
          originalUMPath:
            `packagingItems.${index}.originalUnitMeasure` as const,
          originalPricePath:
            `packagingItems.${index}.originalPricePerUnit` as const,
          // Hidden fields
          namePath:
            `packagingItems.${index}.packagingName` as Path<SupplierOrderCreateInput>,
          codePath:
            `packagingItems.${index}.productCode` as Path<SupplierOrderCreateInput>,
        }

  const itemName = itemType === 'products' ? 'product' : 'packaging'

  // Watch fields
  const selectedItemId = form.watch(itemNamePath)
  const pricePerUnit = form.watch(pricePath)
  const quantity = form.watch(quantityPath)
  const selectedUM = form.watch(unitMeasurePath)

  const [itemDetails, setItemDetails] = useState<SearchResult | null>(
    initialItemData || null
  )
  const [lastPrice, setLastPrice] = useState<number | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [priceNotFound, setPriceNotFound] = useState(false)

  // 2. FETCH LAST PRICE (Logică Identică)
  useEffect(() => {
    if (!selectedItemId || String(selectedItemId).length < 24) return

    setIsLoadingPrice(true)
    const priceUrl =
      itemType === 'products'
        ? `/api/admin/management/receptions/last-price/${selectedItemId}`
        : `/api/admin/management/receptions/last-price-packaging/${selectedItemId}`

    fetch(priceUrl)
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        setIsLoadingPrice(false)
        if (data && typeof data.price === 'number') {
          setLastPrice(data.price)
          setPriceNotFound(false)
        } else {
          setLastPrice(null)
          setPriceNotFound(true)
        }
      })
      .catch(() => {
        setIsLoadingPrice(false)
        setPriceNotFound(true)
      })
  }, [selectedItemId, itemType])

  // 3. CALCUL PROCENT DIFERENȚĂ (Logică Identică)
  const priceDifferencePercentage = useMemo(() => {
    if (
      lastPrice === null ||
      lastPrice === 0 ||
      typeof pricePerUnit !== 'number' ||
      !itemDetails ||
      !selectedUM
    ) {
      return null
    }

    const historicalPriceConverted = convertBasePriceToDisplay(
      lastPrice,
      selectedUM,
      {
        unit: itemDetails.unit || '',
        packagingUnit: itemDetails.packagingUnit,
        packagingQuantity: itemDetails.packagingQuantity,
        itemsPerPallet: itemDetails.itemsPerPallet,
      }
    )

    if (!historicalPriceConverted) return null
    const diff =
      ((pricePerUnit - historicalPriceConverted) / historicalPriceConverted) *
      100
    return Math.abs(diff) < 0.01 ? null : diff
  }, [pricePerUnit, lastPrice, selectedUM, itemDetails])

  // 4. CALCUL TOTALURI VIZUALE (Logică Identică cu Recepția)
  const calculatedValues = useMemo(() => {
    if (
      !itemDetails ||
      !quantity ||
      !selectedUM ||
      typeof pricePerUnit !== 'number'
    )
      return null

    const { unit, packagingUnit, packagingQuantity, itemsPerPallet } =
      itemDetails

    const totalBaseUnitsPerPallet =
      itemsPerPallet && itemsPerPallet > 0
        ? packagingQuantity
          ? itemsPerPallet * packagingQuantity
          : itemsPerPallet
        : 0

    let baseQuantity = 0
    let pricePerBaseUnit = 0

    // Conversie Input -> Bază
    switch (selectedUM) {
      case unit:
        baseQuantity = quantity
        pricePerBaseUnit = pricePerUnit
        break
      case packagingUnit:
        if (!packagingQuantity) return null
        baseQuantity = quantity * packagingQuantity
        pricePerBaseUnit = pricePerUnit / packagingQuantity
        break
      case 'palet':
        if (totalBaseUnitsPerPallet <= 0) return null
        baseQuantity = quantity * totalBaseUnitsPerPallet
        pricePerBaseUnit = pricePerUnit / totalBaseUnitsPerPallet
        break
      default:
        baseQuantity = quantity
        pricePerBaseUnit = pricePerUnit
    }

    if (isNaN(pricePerBaseUnit) || !isFinite(pricePerBaseUnit)) return null

    // Prețuri derivate
    const pricePerPackagingUnit = packagingQuantity
      ? pricePerBaseUnit * packagingQuantity
      : null
    const pricePerPallet =
      totalBaseUnitsPerPallet > 0
        ? pricePerBaseUnit * totalBaseUnitsPerPallet
        : null
    const lineTotal = quantity * pricePerUnit

    // Cantități derivate (pentru afișare)
    const totalPackagingUnits = packagingQuantity
      ? baseQuantity / packagingQuantity
      : null
    const totalPallets =
      totalBaseUnitsPerPallet > 0
        ? baseQuantity / totalBaseUnitsPerPallet
        : null

    return {
      baseQuantity: baseQuantity.toFixed(2),
      totalPackaging: totalPackagingUnits
        ? totalPackagingUnits.toFixed(2)
        : null,
      totalPallets: totalPallets ? totalPallets.toFixed(2) : null,
      pricePerBaseUnit,
      pricePerPackagingUnit,
      pricePerPallet,
      lineTotal,
    }
  }, [quantity, selectedUM, pricePerUnit, itemDetails])

  // 5. OPȚIUNI UM
  const uniqueUmOptions = useMemo(() => {
    if (!itemDetails) return []
    const options = new Set<string>()
    if (itemDetails.unit) options.add(itemDetails.unit)
    if (itemDetails.packagingUnit) options.add(itemDetails.packagingUnit)
    if (itemDetails.itemsPerPallet && itemDetails.itemsPerPallet > 0)
      options.add('palet')
    if (options.size === 0 && selectedUM) options.add(selectedUM)
    return Array.from(options)
  }, [itemDetails, selectedUM])

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-3 mb-3 bg-muted/20'>
      {/* Rândul 1: Selector Produs */}
      <FormField
        name={itemNamePath}
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormLabel className='flex justify-between items-center'>
              <div>
                {itemType === 'products' ? 'Produs' : 'Ambalaj'} <span>*</span>
              </div>
              <div className='text-right text-xs'>
                {isLoadingPrice ? (
                  <span className='text-muted-foreground animate-pulse'>
                    Se verifică...
                  </span>
                ) : priceNotFound ? (
                  <span className='text-amber-600 font-medium'>
                    Nu există istoric
                  </span>
                ) : lastPrice !== null && itemDetails && selectedUM ? (
                  <span className='text-muted-foreground'>
                    Ultimul preț:{' '}
                    {formatCurrency(
                      convertBasePriceToDisplay(lastPrice, selectedUM, {
                        unit: itemDetails.unit || '',
                        packagingUnit: itemDetails.packagingUnit,
                        packagingQuantity: itemDetails.packagingQuantity,
                        itemsPerPallet: itemDetails.itemsPerPallet,
                      })
                    )}{' '}
                    / {selectedUM}{' '}
                    {priceDifferencePercentage != null && (
                      <span
                        className={cn(
                          'font-semibold',
                          priceDifferencePercentage > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        )}
                      >
                        {priceDifferencePercentage > 0 ? '+' : ''}
                        {priceDifferencePercentage.toFixed(2)}%
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
            </FormLabel>

            <AutocompleteSearch
              searchType={itemType === 'products' ? 'product' : 'packaging'}
              value={field.value as string}
              initialSelectedItem={initialItemData}
              onChange={(id: string, item: SearchResult | null) => {
                form.setValue(itemNamePath, id, { shouldValidate: true })

                // --- POPULARE HIDDEN FIELDS FĂRĂ ANY ---
                if (item) {
                  form.setValue(namePath, item.name || '')
                  form.setValue(codePath, item.productCode || '')
                }

                if (item?.unit) {
                  form.setValue(unitMeasurePath, item.unit)
                  form.setValue(originalUMPath, item.unit)
                }
                setItemDetails(item || null)
              }}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Rândul 2: Inputs */}
      <div className='flex items-end gap-2'>
        <FormField
          name={quantityPath}
          control={form.control}
          render={({ field }) => (
            <FormItem className='flex-1'>
              <FormLabel>Cantitate *</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  {...field}
                  onChange={(e) => {
                    const rawVal = e.target.value
                    const val = rawVal === '' ? undefined : parseFloat(rawVal)
                    field.onChange(rawVal === '' ? '' : val)
                    form.setValue(originalQuantityPath, val)
                  }}
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
            <FormItem className='w-24'>
              <FormLabel>UM *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue(originalUMPath, value)
                }}
                value={field.value}
                disabled={!itemDetails}
              >
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='-' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {uniqueUmOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          name={pricePath}
          control={form.control}
          render={({ field }) => (
            <FormItem className='flex-1'>
              <FormLabel>Preț Unitar *</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  {...field}
                  onChange={(e) => {
                    const rawVal = e.target.value
                    const val = rawVal === '' ? undefined : parseFloat(rawVal)
                    field.onChange(rawVal === '' ? '' : val)
                    form.setValue(originalPricePath, val)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={vatRatePath}
          control={form.control}
          render={({ field }) => (
            <FormItem className='w-20'>
              <FormLabel>TVA</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='%' />
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

        <Button
          type='button'
          size='icon'
          variant='ghost'
          onClick={onRemove}
          className='text-destructive hover:text-destructive hover:bg-destructive/10 mb-0.5'
          title='Șterge rândul'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>

      {/* Rândul 3: Sumar Detaliat */}
      {calculatedValues && itemDetails && (
        <div className='mt-2 space-y-3 border-t pt-2 text-xs'>
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
                {(itemDetails.itemsPerPallet || 0) > 0 && (
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
                <div className='font-bold'>{calculatedValues.baseQuantity}</div>
              </div>
              {calculatedValues.totalPackaging != null &&
                itemDetails.packagingUnit && (
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

          <div>
            <div className='font-semibold text-foreground mb-1'>
              Prețuri Calculate:
            </div>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div className='rounded bg-background p-1'>
                <div className='text-muted-foreground'>
                  Preț / {itemDetails.unit}
                </div>
                <div className='font-bold'>
                  {formatCurrency(calculatedValues.pricePerBaseUnit)}
                </div>
              </div>
              {calculatedValues.pricePerPackagingUnit != null && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>
                    Preț / {itemDetails.packagingUnit}
                  </div>
                  <div className='font-bold'>
                    {formatCurrency(calculatedValues.pricePerPackagingUnit)}
                  </div>
                </div>
              )}
              {calculatedValues.pricePerPallet != null && (
                <div className='rounded bg-background p-1'>
                  <div className='text-muted-foreground'>Preț / palet</div>
                  <div className='font-bold'>
                    {formatCurrency(calculatedValues.pricePerPallet)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex justify-end mt-2'>
            <div className='font-semibold text-foreground text-sm border-t pt-2'>
              Total Linie (Net): {formatCurrency(calculatedValues.lineTotal)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
