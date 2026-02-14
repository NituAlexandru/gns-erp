'use client'

import { type UseFormReturn } from 'react-hook-form'
import { useState, useEffect, useMemo } from 'react'
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  LockKeyhole,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn, formatCurrency } from '@/lib/utils'
import { ReceptionCreateInput } from '@/lib/db/modules/reception/types'
import { AutocompleteSearch, type SearchResult } from './autocomplete-search'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { MultiStringInput } from './multi-string-input'

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
  },
): number {
  const { unit, packagingUnit, packagingQuantity, itemsPerPallet } = itemDetails

  if (unitMeasure === unit) return basePrice
  if (unitMeasure === packagingUnit && packagingQuantity)
    return basePrice * packagingQuantity
  if (unitMeasure === 'palet' && itemsPerPallet) {
    const totalBaseUnitsPerPallet = packagingQuantity
      ? itemsPerPallet * packagingQuantity
      : itemsPerPallet
    return basePrice * totalBaseUnitsPerPallet
  }
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

  // State pentru acordeon
  const [isQualityOpen, setIsQualityOpen] = useState(false)
  const [isUmConfirmed, setIsUmConfirmed] = useState(false)

  const {
    itemName,
    itemNamePath,
    quantityPath,
    documentQuantityPath,
    unitMeasurePath,
    pricePath,
    vatRatePath,
    qualityPath, // Calea către qualityDetails
  } =
    itemType === 'products'
      ? {
          itemName: 'product' as const,
          itemNamePath: `products.${index}.product` as const,
          quantityPath: `products.${index}.quantity` as const,
          documentQuantityPath: `products.${index}.documentQuantity` as const,
          unitMeasurePath: `products.${index}.unitMeasure` as const,
          pricePath: `products.${index}.invoicePricePerUnit` as const,
          vatRatePath: `products.${index}.vatRate` as const,
          qualityPath: `products.${index}.qualityDetails` as const,
        }
      : {
          itemName: 'packaging' as const,
          itemNamePath: `packagingItems.${index}.packaging` as const,
          quantityPath: `packagingItems.${index}.quantity` as const,
          documentQuantityPath:
            `packagingItems.${index}.documentQuantity` as const,
          unitMeasurePath: `packagingItems.${index}.unitMeasure` as const,
          pricePath: `packagingItems.${index}.invoicePricePerUnit` as const,
          vatRatePath: `packagingItems.${index}.vatRate` as const,
          qualityPath: `packagingItems.${index}.qualityDetails` as const,
        }

  const selectedItemId = form.watch(itemNamePath)
  const invoicePrice = form.watch(pricePath)
  const quantity = form.watch(quantityPath)
  const selectedUM = form.watch(unitMeasurePath)

  // ... (Logica de lastPrice și calcule rămâne identică, o păstrăm) ...
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
      lastPrice === null ||
      lastPrice === 0 ||
      typeof invoicePrice !== 'number' ||
      !itemDetails ||
      !selectedUM
    ) {
      return null
    }
    const { unit, packagingUnit, packagingQuantity, itemsPerPallet } =
      itemDetails
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
        if (!itemsPerPallet || itemsPerPallet <= 0) return null
        const total = (packagingQuantity ?? 1) * itemsPerPallet
        if (total === 0) return null
        currentPricePerBaseUnit = invoicePrice / total
        break
      default:
        return null
    }
    if (isNaN(currentPricePerBaseUnit) || !isFinite(currentPricePerBaseUnit))
      return null
    const diff = ((currentPricePerBaseUnit - lastPrice) / lastPrice) * 100
    return Math.abs(diff) < 0.01 ? null : diff
  }, [invoicePrice, lastPrice, selectedUM, itemDetails])

  const calculatedValues = useMemo(() => {
    if (
      !itemDetails ||
      !quantity ||
      !selectedUM ||
      typeof invoicePrice !== 'number'
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
    )
      return null

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
    <Collapsible
      open={isQualityOpen}
      onOpenChange={setIsQualityOpen}
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-3 mb-3 transition-colors',
        isQualityOpen ? 'bg-accent/5 border-primary/20' : 'bg-muted/20',
      )}
    >
      {/* Rândul Principal (Produs) */}
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
                    <span className='text-muted-foreground animate-pulse'>
                      Se verifică...
                    </span>
                  ) : priceNotFound ? (
                    <span className='text-amber-600 font-medium'>
                      Nu există recepții anterioare
                    </span>
                  ) : lastPrice !== null && itemDetails && selectedUM ? (
                    <span className='text-muted-foreground'>
                      Ultimul preț:{' '}
                      {formatCurrency(
                        convertBasePriceToDisplay(lastPrice, selectedUM, {
                          unit: itemDetails.unit!,
                          packagingUnit: itemDetails.packagingUnit,
                          packagingQuantity: itemDetails.packagingQuantity,
                          itemsPerPallet: itemDetails.itemsPerPallet,
                        }),
                      )}{' '}
                      / {selectedUM}{' '}
                      {priceDifferencePercentage != null && (
                        <span
                          className={cn(
                            'font-semibold',
                            priceDifferencePercentage > 0
                              ? 'text-red-600'
                              : 'text-green-600',
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
                searchType={itemName}
                value={field.value}
                initialSelectedItem={initialItemData}
                onChange={(id, item) => {
                  form.setValue(itemNamePath, id, { shouldValidate: true })
                  if (item?.unit)
                    form.setValue(unitMeasurePath, item.unit, {
                      shouldValidate: true,
                    })
                  setItemDetails(item || null)
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Rândul Secundar: Cantitate, UM, Preț + Butoane */}
      <div className='flex items-end gap-2'>
        <FormField
          name={documentQuantityPath}
          control={form.control}
          render={({ field }) => (
            <FormItem className='flex-1'>
              <FormLabel className='text-xs text-muted-foreground whitespace-nowrap'>
                Cantitate Document
              </FormLabel>
              <div className='relative w-full'>
                {!isUmConfirmed && (
                  <div className='absolute top-full left-0 mb-1 w-full text-[10px] font-bold text-destructive animate-pulse whitespace-nowrap pointer-events-none'>
                    Confirmă U.M. →
                  </div>
                )}
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    disabled={!isUmConfirmed}
                    placeholder='Cantitate Document'
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? '' : parseFloat(e.target.value),
                      )
                    }
                    className={cn(
                      'bg-muted/20',
                      !isUmConfirmed && 'cursor-not-allowed opacity-50',
                    )}
                  />
                </FormControl>
                {!isUmConfirmed && (
                  <LockKeyhole className='absolute right-2 top-2.5 h-4 w-4 text-destructive opacity-70' />
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name={quantityPath}
          control={form.control}
          render={({ field }) => (
            <FormItem className='flex-1'>
              <FormLabel className='font-bold text-primary whitespace-nowrap'>
                Cant. Primită *
              </FormLabel>
              <div className='relative w-full'>
                {!isUmConfirmed && (
                  <div className='absolute top-full left-0 mb-1 w-full text-[10px] font-bold text-destructive animate-pulse whitespace-nowrap pointer-events-none'>
                    Confirmă U.M. →
                  </div>
                )}
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    disabled={!isUmConfirmed}
                    className={cn(
                      !isUmConfirmed &&
                        'cursor-not-allowed bg-muted text-muted-foreground',
                    )}
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? '' : parseFloat(e.target.value),
                      )
                    }
                  />
                </FormControl>
                {!isUmConfirmed && (
                  <LockKeyhole className='absolute right-2 top-2.5 h-4 w-4 text-destructive opacity-70' />
                )}
              </div>
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
                onOpenChange={(open) => {
                  if (open) setIsUmConfirmed(true)
                }}
                onValueChange={(val) => {
                  field.onChange(val)
                  setIsUmConfirmed(true)
                }}
                value={field.value}
                disabled={!itemDetails}
              >
                <FormControl>
                  <SelectTrigger
                    className={cn(
                      'w-full',
                      !isUmConfirmed && 'ring-2 ring-red-500',
                    )}
                  >
                    <SelectValue placeholder='UM' />
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
              <FormLabel>Preț (fără TVA) *</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === '' ? null : parseFloat(e.target.value),
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
        )}

        <Button
          type='button'
          size='icon'
          variant='ghost'
          onClick={onRemove}
          className='flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10'
          title='Șterge rândul'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>

      {/* --- RÂNDUL 3: Buton Nota Conformitate --- */}
      <div className='flex justify-start border-t border-dashed pt-2 mt-1'>
        <CollapsibleTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className={cn(
              'text-xs gap-2 px-2 h-7',
              isQualityOpen
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground',
            )}
          >
            <FileText className='h-3.5 w-3.5' />
            {isQualityOpen
              ? 'Ascunde Detalii Calitate'
              : 'Adaugă Nota Conformitate (Loturi, Certificate)'}
            {isQualityOpen ? (
              <ChevronUp className='h-3 w-3' />
            ) : (
              <ChevronDown className='h-3 w-3' />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      {/* --- SECȚIUNEA EXPANDABILĂ: DETALII CALITATE --- */}
      <CollapsibleContent className='pt-2'>
        <div className='bg-background rounded-md border p-3 shadow-sm space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* 1. Certificate */}
            <div className='bg-muted/30 p-2 rounded border border-dashed'>
              <MultiStringInput
                control={form.control}
                name={`${qualityPath}.certificateNumbers`}
                label='Certificate Conformitate / Calitate'
                placeholder='Ex: CE-1029 (Enter)'
              />
            </div>

            {/* 2. Loturi */}
            <div className='bg-muted/30 p-2 rounded border border-dashed'>
              <MultiStringInput
                control={form.control}
                name={`${qualityPath}.lotNumbers`}
                label='Șarje / Loturi Producție'
                placeholder='Ex: A55, B-2024 (Enter)'
              />
            </div>

            {/* 3. Rapoarte */}
            <div className='bg-muted/30 p-2 rounded border border-dashed'>
              <MultiStringInput
                control={form.control}
                name={`${qualityPath}.testReports`}
                label='Declaratie / Rapoarte Încercări'
                placeholder='Ex: Raport Lab 55 (Enter)'
              />
            </div>

            {/* 4. Note */}
            <div className='bg-muted/30 p-2 rounded border border-dashed'>
              <FormField
                name={`${qualityPath}.additionalNotes`}
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold text-muted-foreground'>
                      Note Adiționale Calitate
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className='h-[76px] resize-none text-sm'
                        placeholder='Alte detalii relevante...'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>

      {/* --- Totaluri Calculate (Rămân la final) --- */}
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

          {/* Prețuri */}
          <div>
            <div className='font-semibold text-foreground mb-1 flex justify-between'>
              <span>Prețuri & Costuri:</span>
              <div className='text-right'>
                <div className='font-normal text-sm text-muted-foreground'>
                  Valoare Factură:{' '}
                  <span className='font-medium'>
                    {formatCurrency(calculatedValues.invoiceTotalPrice)}
                  </span>
                </div>
                {itemType === 'products' ? (
                  <div className='font-bold text-lg text-primary'>
                    Valoare cu Transport:{' '}
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
              {itemDetails.packagingUnit && (
                <div className='space-y-1'>
                  <div className='rounded bg-background p-1'>
                    <div className='text-muted-foreground'>
                      Preț / {itemDetails.packagingUnit}
                    </div>
                    <div className='font-bold'>
                      {formatCurrency(
                        calculatedValues.invoicePricePerPackagingUnit!,
                      )}
                    </div>
                  </div>
                  <div className='rounded bg-lime-950 p-1'>
                    <div className='text-lime-400'>
                      Cost / {itemDetails.packagingUnit}
                    </div>
                    <div className='font-bold text-white'>
                      {formatCurrency(
                        calculatedValues.landedCostPerPackagingUnit!,
                      )}
                    </div>
                  </div>
                </div>
              )}
              {(itemDetails.itemsPerPallet || 0) > 0 && (
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
    </Collapsible>
  )
}
