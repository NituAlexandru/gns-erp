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
import { formatCurrency, formatCurrency3, toSlug } from '@/lib/utils'
import { OrderLineItemRowProps } from './OrderLineItemRow'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'
import { AvailableUnit } from '@/lib/db/modules/product/types'
import ProductConversionInfo from '@/app/(root)/catalog-produse/details/product-conversion-info'
import { ClientHistoryButton } from './ClientHistoryButton'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import ProductPreviewContent from '@/app/(root)/catalog-produse/details/product-preview-content'

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

  // 1. EXTRAGEM DATELE PRIMA DATĂ (Ca să fie disponibile pentru funcții)
  const {
    productId,
    priceAtTimeOfOrder = 0,
    quantity = 0,
    vatRateDetails,
    productName,
    baseUnit,
    packagingOptions, // Aici e cheia: vine din OrderLineItem, nu direct din Product
    minimumSalePrice = 0,
    unitOfMeasure,
  } = itemData || {}

  // 2. DEFINIM FUNCȚIA ACUM (Când are acces la variabilele de mai sus)
  const getInitialFactor = () => {
    // Safety check: dacă nu avem date, plecăm de la 1
    if (!unitOfMeasure || !baseUnit || unitOfMeasure === baseUnit) return 1

    // Căutăm în options (care există pe OrderLineItem)
    const option = packagingOptions?.find(
      (opt: any) => opt.unitName === unitOfMeasure,
    )
    return option ? option.baseUnitEquivalent : 1
  }

  // 3. INIȚIALIZĂM REF-ul CU REZULTATUL FUNCȚIEI
  // Acest cod rulează o singură dată la mount.
  const prevConversionFactor = useRef(getInitialFactor())

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

  // Sincronizare inițială hook
  useEffect(() => {
    if (unitOfMeasureFromForm && handleUnitChange) {
      handleUnitChange(unitOfMeasureFromForm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detectare schimbare manuală dropdown
  useEffect(() => {
    if (unitOfMeasureFromForm && handleUnitChange) {
      handleUnitChange(unitOfMeasureFromForm)
    }
  }, [unitOfMeasureFromForm, handleUnitChange])

  // --- LOGICA DE PREȚ (FIXATĂ) ---
  useEffect(() => {
    // Verificăm dacă factorul s-a schimbat față de ce știam noi (referința)
    if (conversionFactor && conversionFactor !== prevConversionFactor.current) {
      const path = `lineItems.${index}.priceAtTimeOfOrder` as const
      const currentPrice = Number(getValues(path) ?? 0)

      const prev = prevConversionFactor.current || 1
      if (prev === 0) return // Safety

      const priceInBaseUnit = currentPrice / prev
      const nextFactor = conversionFactor || 1

      const newConvertedPrice = priceInBaseUnit * nextFactor
      const finalPrice = Number(newConvertedPrice.toFixed(3))

      // Aplicăm noul preț
      setValue(path, finalPrice, { shouldDirty: true })

      // Actualizăm referința
      prevConversionFactor.current = nextFactor
    } else if (conversionFactor) {
      // Dacă sunt egale (la încărcare), sincronizăm referința preventiv
      prevConversionFactor.current = conversionFactor
    }
  }, [conversionFactor, index, getValues, setValue])

  // Validare preț minim
  useEffect(() => {
    if (!convertedPrice || convertedPrice <= 0) return
    const path = `lineItems.${index}.priceAtTimeOfOrder` as const
    const currentPrice = Number(getValues(path) ?? 0)
    const formattedMinPrice = Number(convertedPrice.toFixed(3))

    if (!isAdmin && currentPrice < formattedMinPrice - 0.01) {
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

  const displayUnits: AvailableUnit[] = useMemo(() => {
    if (!baseUnit) return []

    // 1. Căutăm dacă există un ambalaj intermediar (ex: Sac, Cutie) pentru a face raportarea
    const intermediatePack = packagingOptions?.find(
      (opt: any) =>
        !opt.unitName.toLowerCase().includes('palet') &&
        opt.baseUnitEquivalent > 1,
    )

    // 2. Începem cu unitatea de bază
    const units: AvailableUnit[] = [{ name: baseUnit, type: 'BASE', factor: 1 }]

    // 3. Adăugăm restul opțiunilor și calculăm textul (displayDetails)
    packagingOptions?.forEach((opt: any) => {
      const isPallet = opt.unitName.toLowerCase().includes('palet')
      let details = opt.displayDetails

      // LOGICA DE CALCUL: Dacă e Palet și avem Sac, calculăm câți saci sunt
      if (isPallet && !details && intermediatePack) {
        const count =
          opt.baseUnitEquivalent / intermediatePack.baseUnitEquivalent
        // Ex: 1600 / 40 = 40. Rezultat: "40 sac / palet"
        details = `${Number(count.toFixed(2))} ${intermediatePack.unitName} / palet`
      }

      units.push({
        name: opt.unitName,
        type: isPallet ? 'PALLET' : 'PACKAGING',
        factor: opt.baseUnitEquivalent,
        displayDetails: details, // Trimitem textul calculat către componenta ta
      })
    })

    return units
  }, [baseUnit, packagingOptions])

  if (!productId || !baseUnit) {
    return null
  }

  const lineSubtotal = priceAtTimeOfOrder * quantity
  const lineVatValue = vatRateDetails?.value || 0
  const lineTotal = lineSubtotal + lineVatValue

  return (
    <TableRow>
      <TableCell className='font-medium w-full py-0'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center justify-between gap-2'>
            <HoverCard openDelay={500}>
              <HoverCardTrigger asChild>
                <span className='cursor-pointer hover:underline decoration-dotted underline-offset-4'>
                  {productName}
                </span>
              </HoverCardTrigger>

              <HoverCardContent
                side='top'
                align='start'
                sideOffset={8}
                alignOffset={-5}
                className='z-[10] w-[700px] lg:w-[1000px] xl:w-[1200px] 2xl:w-[1400px] p-0 pb-10 shadow-2xl border-2 bg-background overflow-hidden'
              >
                <div className='p-4 h-[75vh]  bg-background'>
                  <ProductPreviewContent
                    id={productId}
                    slug={toSlug(productName)}
                    isAdmin={isAdmin}
                  />
                </div>
              </HoverCardContent>
            </HoverCard>

            <ClientHistoryButton
              productId={productId}
              productName={productName}
              availableUnits={displayUnits}
            />
          </div>

          <div className='origin-top-left scale-80 w-[125%]'>
            <ProductConversionInfo units={displayUnits} />
          </div>
        </div>
      </TableCell>

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
                    {formatCurrency3(convertedPrice)}
                  </span>
                </p>
              )}
              <Input
                {...field}
                type='number'
                step='0.001'
                onChange={(e) =>
                  field.onChange(parseFloat(e.target.value) || 0)
                }
                onBlur={(e) => {
                  let numValue = parseFloat(e.target.value)
                  const formattedMinPrice = Number(convertedPrice.toFixed(3))

                  if (!isNaN(numValue)) {
                    if (numValue < formattedMinPrice) {
                      if (isAdmin) {
                        toast.warning(
                          `Preț setat sub limita minimă (${formatCurrency(formattedMinPrice)}). Permis pentru Admin.`,
                        )
                      } else {
                        numValue = formattedMinPrice
                        toast.info(
                          `Prețul a fost ajustat la minimul de ${formatCurrency(formattedMinPrice)}.`,
                        )
                      }
                    }
                    field.onChange(numValue.toFixed(3))
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
