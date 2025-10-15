'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import {
  calculateMinimumPrice,
  getProductForOrderLine,
  searchStockableItems,
} from '@/lib/db/modules/product/product.actions'
import { getVatRates } from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import {
  getActiveCommonServices,
  getActivePermits,
} from '@/lib/db/modules/setting/services/service.actions'
import { OrderLineItemRow } from './mini-components/OrderLineItemRow'
import {
  ProductForOrderLine,
  SearchedProduct,
} from '@/lib/db/modules/product/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { SearchedService } from '@/lib/db/modules/setting/services/types'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'
import { SearchResultItem } from './mini-components/SearchResultItem'
import { LogisticsTotals } from './mini-components/LogisticsTotals'
import { formatCurrency } from '@/lib/utils'
import { getPackagingForOrderLine } from '@/lib/db/modules/packaging-products/packaging.actions'
import { PackagingForOrderLine } from '@/lib/db/modules/packaging-products/types'

interface OrderItemsManagerProps {
  isAdmin: boolean
}

type StockableItemForOrderLine = ProductForOrderLine | PackagingForOrderLine

function getUnitPreference(productId: string, defaultUnit: string): string {
  // Verificăm dacă suntem în browser, pentru a nu avea erori pe server
  if (typeof window === 'undefined') {
    return defaultUnit
  }
  try {
    const savedPrefs = window.localStorage.getItem('unitPreferences')
    const preferences = savedPrefs ? JSON.parse(savedPrefs) : {}
    return preferences[productId] || defaultUnit
  } catch (error) {
    console.error('Eroare la citirea preferințelor din localStorage:', error)
    return defaultUnit
  }
}

export function OrderItemsManager({ isAdmin }: OrderItemsManagerProps) {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  })

  const deliveryMethod = useWatch({ control, name: 'deliveryMethod' })
  const lineItems = useWatch({
    control,
    name: 'lineItems',
  }) as OrderLineItemInput[]

  const [vatRates, setVatRates] = useState<VatRateDTO[]>([])
  const [itemPopoverOpen, setItemPopoverOpen] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [itemSearchResults, setItemSearchResults] = useState<SearchedProduct[]>(
    []
  )
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const debouncedItemSearch = useDebounce(itemSearchTerm, 300)
  // Stări pentru Servicii și Autorizații
  const [services, setServices] = useState<SearchedService[]>([])
  const [permits, setPermits] = useState<SearchedService[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isAddingItem, setIsAddingItem] = useState(false)
  // Stări pentru popover-ul de autorizații
  const [isPermitPopoverOpen, setIsPermitPopoverOpen] = useState(false)
  const [permitSearchTerm, setPermitSearchTerm] = useState('')

  useEffect(() => {
    async function fetchData() {
      setIsLoadingServices(true)
      const vatResult = await getVatRates()
      if (vatResult.success && vatResult.data) {
        setVatRates(vatResult.data as VatRateDTO[])
      }

      const [servicesResult, permitsResult] = await Promise.all([
        getActiveCommonServices(),
        getActivePermits(),
      ])

      setServices(servicesResult)
      setPermits(permitsResult)
      setIsLoadingServices(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function fetchItems() {
      if (debouncedItemSearch.length < 2) {
        setItemSearchResults([])
        return
      }
      setIsLoadingItems(true)
      const items = await searchStockableItems(debouncedItemSearch)
      setItemSearchResults(items)
      setIsLoadingItems(false)
    }
    fetchItems()
  }, [debouncedItemSearch])

  const handleSelectItem = async (item: SearchedProduct) => {
    if (!deliveryMethod) {
      toast.error('Te rog selectează mai întâi Modul de Livrare.')
      return
    }
    setIsAddingItem(true)
    setItemPopoverOpen(false)
    setItemSearchTerm('')

    try {
      let fullData: StockableItemForOrderLine | null = null

      if (item.itemType === 'Produs') {
        fullData = await getProductForOrderLine(item._id)
      } else if (item.itemType === 'Ambalaj') {
        fullData = await getPackagingForOrderLine(item._id)
      }

      if (!fullData) {
        toast.error(
          'Detaliile complete ale articolului nu au putut fi încărcate.'
        )
        setIsAddingItem(false)
        return
      }

      const unformattedMinPrice = await calculateMinimumPrice(
        item._id,
        deliveryMethod
      )
      const minPrice = Number(unformattedMinPrice.toFixed(2))

      const defaultVat = vatRates.find((v) => v.isDefault) || vatRates[0]
      if (!defaultVat) {
        toast.error('EROARE: Nu a fost găsită nicio cotă de TVA.')
        return
      }

      const options = []
      const hasIntermediatePackaging =
        fullData.packagingUnit &&
        fullData.packagingQuantity &&
        fullData.packagingQuantity > 0
      const hasPallet =
        'itemsPerPallet' in fullData &&
        fullData.itemsPerPallet &&
        fullData.itemsPerPallet > 0

      if (hasIntermediatePackaging) {
        options.push({
          unitName: fullData.packagingUnit,
          baseUnitEquivalent: fullData.packagingQuantity,
        })
      }
      if (hasPallet && 'itemsPerPallet' in fullData) {
        let palletEquivalent = fullData.itemsPerPallet
        if (hasIntermediatePackaging) {
          palletEquivalent =
            fullData.itemsPerPallet * fullData.packagingQuantity!
        }
        options.push({
          unitName: 'palet',
          baseUnitEquivalent: palletEquivalent,
        })
      }

      const initialUnit = getUnitPreference(
        fullData._id.toString(),
        fullData.unit
      )

      const newItem: OrderLineItemInput = {
        productId: fullData._id.toString(),
        isManualEntry: false,
        productName: fullData.name,
        productCode: fullData.productCode,
        quantity: 1,
        priceAtTimeOfOrder: minPrice,
        vatRateDetails: {
          rate: defaultVat.rate,
          value: Number((minPrice * (defaultVat.rate / 100)).toFixed(2)),
        },
        unitOfMeasure: initialUnit,
        unitOfMeasureCode: getEFacturaUomCode(initialUnit),
        baseUnit: fullData.unit,
        packagingOptions: options,
        weight: fullData.weight || 0,
        volume: fullData.volume || 0,
        length: fullData.length || 0,
        width: fullData.width || 0,
        height: fullData.height || 0,
        packagingUnit: fullData.packagingUnit,
        packagingQuantity: fullData.packagingQuantity,
      }

      append(newItem)
    } catch (error) {
      console.error('Eroare la adăugarea articolului:', error)
      toast.error('Eroare la adăugarea articolului.')
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleSelectService = (service: SearchedService) => {
    const vat = vatRates.find((v) => v._id === service.vatRateId)
    const vatRate = vat ? vat.rate : 21
    const newItem: OrderLineItemInput = {
      serviceId: service._id,
      isManualEntry: false,
      productName: service.name,
      productCode: service.code,
      quantity: 1,
      unitOfMeasure: service.unitOfMeasure,
      unitOfMeasureCode: getEFacturaUomCode(service.unitOfMeasure),
      priceAtTimeOfOrder: service.price,
      vatRateDetails: {
        rate: vatRate,
        value: Number((service.price * (vatRate / 100)).toFixed(2)),
      },
      isPerDelivery: service.isPerDelivery || false,
    }
    append(newItem)
  }

  const handleSelectPermit = (permit: SearchedService) => {
    handleSelectService(permit)
    setIsPermitPopoverOpen(false)
    setPermitSearchTerm('')
  }

  const handleAddManualLine = () => {
    const defaultVat = vatRates.find((v) => v.isDefault) || vatRates[0]
    if (!defaultVat) {
      toast.error('EROARE: Nu a fost găsită nicio cotă de TVA.')
      return
    }
    const newItem: OrderLineItemInput = {
      productId: `manual_${new Date().getTime()}`,
      isManualEntry: true,
      productName: '',
      productCode: '',
      quantity: 1,
      unitOfMeasure: 'bucata',
      unitOfMeasureCode: 'H87',
      priceAtTimeOfOrder: 0,
      vatRateDetails: {
        rate: defaultVat.rate,
        value: 0,
      },
    }
    append(newItem)
  }

  const filteredPermits = useMemo(() => {
    if (!permitSearchTerm) return permits
    return permits.filter((p) =>
      p.name.toLowerCase().includes(permitSearchTerm.toLowerCase())
    )
  }, [permits, permitSearchTerm])

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-start mb-4'>
        <h2 className='text-lg font-semibold'> Articole Comandă</h2>
        <LogisticsTotals lineItems={lineItems} />
      </div>

      <div className='flex flex-wrap gap-2'>
        <Popover open={itemPopoverOpen} onOpenChange={setItemPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className='w-full sm:w-auto'
              disabled={isAddingItem}
            >
              {isAddingItem ? 'Se adaugă...' : 'Adaugă Articol'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-[650px] p-0' align='start'>
            <Command>
              <CommandInput
                placeholder='Caută produs...'
                value={itemSearchTerm}
                onValueChange={setItemSearchTerm}
              />
              <CommandList>
                {isLoadingItems && (
                  <div className='p-2 text-sm'>Se caută...</div>
                )}
                {!isLoadingItems &&
                  !itemSearchResults.length &&
                  debouncedItemSearch.length > 1 && (
                    <CommandEmpty>Niciun articol găsit.</CommandEmpty>
                  )}
                <CommandGroup>
                  {itemSearchResults.map((item) => (
                    <CommandItem
                      key={item._id}
                      value={item.name}
                      onSelect={() => handleSelectItem(item)}
                      className='p-2'
                    >
                      <SearchResultItem item={item} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='w-full sm:w-auto'
              disabled={isLoadingServices}
            >
              {isLoadingServices ? 'Se încarcă...' : 'Adaugă Serviciu'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-[450px]'
            align='start'
            sideOffset={4}
          >
            {services.length > 0 ? (
              services.map((service) => (
                <DropdownMenuItem
                  key={service._id}
                  onSelect={() => handleSelectService(service)}
                >
                  <span>
                    {service.name} ({formatCurrency(service.price)})
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>
                Niciun serviciu comun găsit.
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Butonul 3: Adaugă Autorizație */}
        <Popover
          open={isPermitPopoverOpen}
          onOpenChange={setIsPermitPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className='w-full sm:w-auto'
              disabled={isLoadingServices}
            >
              {isLoadingServices ? 'Se încarcă...' : 'Adaugă Autorizație'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-[550px] p-0'
            align='start'
            sideOffset={4}
          >
            <Command>
              <CommandInput
                placeholder='Caută autorizație...'
                value={permitSearchTerm}
                onValueChange={setPermitSearchTerm}
              />
              <CommandList>
                {isLoadingServices && (
                  <div className='p-2 text-sm'>Se încarcă...</div>
                )}
                {!isLoadingServices && !filteredPermits.length && (
                  <CommandEmpty>Nicio autorizație găsită.</CommandEmpty>
                )}
                <CommandGroup>
                  {filteredPermits.map((permit) => (
                    <CommandItem
                      key={permit._id}
                      value={permit.name}
                      onSelect={() => handleSelectPermit(permit)}
                    >
                      {permit.name} ({formatCurrency(permit.price)})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button variant='outline' type='button' onClick={handleAddManualLine}>
          Adaugă Linie Liberă
        </Button>
      </div>

      <div className='border rounded-lg'>
        <Table className='border-separate border-spacing-y-3'>
          <TableHeader>
            <TableRow>
              <TableHead>Produs/Serviciu</TableHead>
              <TableHead>Cant.</TableHead>
              <TableHead>U.M.</TableHead>
              <TableHead>Preț Unitar</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead>Valoare</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead>Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length > 0 ? (
              fields.map((field, index) => (
                <OrderLineItemRow
                  key={field.id}
                  index={index}
                  isAdmin={isAdmin}
                  vatRates={vatRates}
                  remove={remove}
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-center h-24 text-muted-foreground'
                >
                  Nu există articole adăugate în comandă.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
