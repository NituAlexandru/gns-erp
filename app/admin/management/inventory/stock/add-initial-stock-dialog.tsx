'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Package, Box, Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { addInitialStock } from '@/lib/db/modules/inventory/inventory.actions.operations'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import {
  AddInitialStockInput,
  addInitialStockSchema,
} from '@/lib/db/modules/inventory/validator'
import {
  AutocompleteSearch,
  SearchResult,
} from '../../reception/autocomplete-search'

interface AddInitialStockDialogProps {
  children?: React.ReactNode
  onSuccess?: () => void
}

export function AddInitialStockDialog({
  children,
  onSuccess,
}: AddInitialStockDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Stocăm detaliile complete ale produsului selectat pentru a calcula UM-urile
  const [selectedItemDetails, setSelectedItemDetails] =
    useState<SearchResult | null>(null)

  const form = useForm<AddInitialStockInput>({
    resolver: zodResolver(addInitialStockSchema),
    defaultValues: {
      stockableItemType: 'ERPProduct',
      location: 'DEPOZIT',
      quantity: 0,
      unitCost: 0,
      unitMeasure: '', // Inițial gol
      reason: 'Import Stoc Inițial',
      supplierId: '',
    },
  })

  const itemType = form.watch('stockableItemType')

  // Calculăm opțiunile de UM bazat pe produsul selectat (LOGICA DIN RECEPȚII)
  const unitOptions = useMemo(() => {
    if (!selectedItemDetails) return []
    const options = new Set<string>()

    // 1. Unitatea de bază
    if (selectedItemDetails.unit) options.add(selectedItemDetails.unit)
    if (selectedItemDetails.packagingUnit)
      options.add(selectedItemDetails.packagingUnit)

    // 2. Palet (dacă există configurat)
    if (
      selectedItemDetails.itemsPerPallet &&
      selectedItemDetails.itemsPerPallet > 0
    ) {
      options.add('palet')
    }

    return Array.from(options)
  }, [selectedItemDetails])

  const handleItemSelect = (id: string, item: SearchResult | null) => {
    form.setValue('stockableItemId', id, { shouldValidate: true })
    setSelectedItemDetails(item)

    if (item) {
      // Setăm default prima unitate găsită (de bază)
      const defaultUnit = item.unit || item.packagingUnit || ''
      form.setValue('unitMeasure', defaultUnit, { shouldValidate: true })
    } else {
      form.setValue('unitMeasure', '')
    }
  }

  async function onSubmit(data: AddInitialStockInput) {
    setIsPending(true)
    try {
      // 1. Definim valorile finale (implicit sunt cele introduse)
      let finalQuantity = data.quantity
      let finalUnitCost = data.unitCost

      // 2. Aplicăm conversia dacă e cazul (LOGICA COPIATĂ DIN ReceptionItemRow)
      if (selectedItemDetails) {
        const { packagingUnit, packagingQuantity, itemsPerPallet, unit } =
          selectedItemDetails

        // Calculăm totalul de unități de bază dintr-un palet (exact ca în recepție)
        const totalBaseUnitsPerPallet =
          itemsPerPallet && itemsPerPallet > 0
            ? packagingQuantity
              ? itemsPerPallet * packagingQuantity
              : itemsPerPallet
            : 0

        // CAZ A: Utilizatorul a selectat PALET
        if (data.unitMeasure === 'palet' && totalBaseUnitsPerPallet > 0) {
          // Ex: 2 Paleți * 500 buc = 1000 bucăți
          finalQuantity = data.quantity * totalBaseUnitsPerPallet

          // Ex: Preț Palet 1000 RON / 500 buc = 2 RON/bucată
          if (data.unitCost > 0) {
            finalUnitCost = data.unitCost / totalBaseUnitsPerPallet
          }
        }

        // CAZ B: Utilizatorul a selectat AMBALAJ SECUNDAR (ex: Cutie)
        else if (
          data.unitMeasure === packagingUnit &&
          packagingQuantity &&
          packagingQuantity > 0
        ) {
          // Ex: 5 Cutii * 10 buc = 50 bucăți
          finalQuantity = data.quantity * packagingQuantity

          // Ex: Preț Cutie 20 RON / 10 buc = 2 RON/bucată
          if (data.unitCost > 0) {
            finalUnitCost = data.unitCost / packagingQuantity
          }
        }
      }

      // 3. Trimitem la server întotdeauna cantitatea în unitatea de bază (pentru stoc corect)
      const payload = {
        ...data,
        quantity: finalQuantity,
        // Backend-ul lucrează cu unitatea de bază a produsului (ex: 'bucata')
        unitMeasure: selectedItemDetails?.unit || 'bucata',
        unitCost: finalUnitCost,
        supplierId: data.supplierId || undefined,
      }

      const res = await addInitialStock(payload)

      if (res.success) {
        toast.success('Stoc inițial adăugat cu succes')
        setOpen(false)
        form.reset()
        setSelectedItemDetails(null)
        if (onSuccess) {
          onSuccess()
        }
      } else {
        console.error('EROARE SERVER:', res.error)
        toast.error(res.error || 'A apărut o eroare')
      }
    } catch (error) {
      // console.error('EROARE CRITICA (CATCH):', error)
      toast.error('Eroare de conexiune')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant='outline'>Adaugă Stoc Inițial</Button>}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[600px] bg-background text-foreground'>
        <DialogHeader>
          <DialogTitle>Import Stoc Inițial</DialogTitle>
          <DialogDescription>
            Adaugă produse existente în sistem direct în stoc.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* 1. TIP ARTICOL */}
            <FormField
              control={form.control}
              name='stockableItemType'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Ce adaugi?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(val) => {
                        field.onChange(val)
                        form.setValue('stockableItemId', '')
                        setSelectedItemDetails(null)
                        form.setValue('unitMeasure', '')
                      }}
                      defaultValue={field.value}
                      className='grid grid-cols-2 gap-4'
                    >
                      <div>
                        <RadioGroupItem
                          value='ERPProduct'
                          id='type-prod'
                          className='peer sr-only'
                        />
                        <Label
                          htmlFor='type-prod'
                          className='flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer'
                        >
                          <Package className='mb-2 h-6 w-6' />
                          Produs
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value='Packaging'
                          id='type-pack'
                          className='peer sr-only'
                        />
                        <Label
                          htmlFor='type-pack'
                          className='flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer'
                        >
                          <Box className='mb-2 h-6 w-6' />
                          Ambalaj
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='location'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locație Stoc</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selectează locația' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVENTORY_LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {LOCATION_NAMES_MAP[loc]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='supplierId'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Furnizor Origine (Opțional)</FormLabel>
                    <AutocompleteSearch
                      searchType='supplier'
                      value={field.value || ''}
                      onChange={(id) => field.onChange(id)}
                      placeholder='Caută furnizor...'
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SELECTOR PRODUS */}
            <FormField
              control={form.control}
              name='stockableItemId'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>
                    Caută {itemType === 'ERPProduct' ? 'Produsul' : 'Ambalajul'}
                  </FormLabel>
                  <AutocompleteSearch
                    searchType={
                      itemType === 'ERPProduct' ? 'product' : 'packaging'
                    }
                    value={field.value}
                    onChange={(id, item) => handleItemSelect(id, item)}
                    placeholder={`Scrie nume sau cod...`}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CANTITATE + UM + PREȚ (Pe același rând pentru aspect compact) */}
            <div className='flex gap-4 items-start'>
              {/* Cantitate */}
              <FormField
                control={form.control}
                name='quantity'
                render={({ field }) => (
                  <FormItem className='flex-1'>
                    <FormLabel>Cantitate</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? 0 : parseFloat(val))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* UM Selector (Fix ca la receptii) */}
              <FormField
                control={form.control}
                name='unitMeasure'
                render={({ field }) => (
                  <FormItem className='w-32'>
                    <FormLabel>UM</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedItemDetails}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='-' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cost */}
              <FormField
                control={form.control}
                name='unitCost'
                render={({ field }) => (
                  <FormItem className='flex-1'>
                    <FormLabel>Cost Unitar (RON)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? 0 : parseFloat(val))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='rounded-md bg-blue-50 p-3 border border-blue-200 flex gap-2 items-start'>
              <Info className='h-4 w-4 text-blue-600 mt-0.5 shrink-0' />
              <div className='text-xs text-blue-800'>
                <span className='font-bold'>Notă:</span> Se va stabili CMP-ul
                inițial. Asigură-te că prețul este corect (fără TVA).
              </div>
            </div>

            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notă Internă</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Ex: Import inițial...'
                      className='resize-none h-20'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Renunță
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Adaugă în Stoc
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
