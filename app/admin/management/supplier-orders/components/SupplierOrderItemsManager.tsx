'use client'

import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Plus, Package, ShoppingCart } from 'lucide-react'
import { SupplierOrderCreateInput } from '@/lib/db/modules/supplier-orders/supplier-order.validator'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { SupplierOrderItemRow } from './SupplierOrderItemRow'
import { SearchResult } from '../../reception/autocomplete-search'

interface SupplierOrderItemsManagerProps {
  form: UseFormReturn<SupplierOrderCreateInput>
  vatRates: VatRateDTO[]
  initialProductsData?: SearchResult[]
  initialPackagingData?: SearchResult[]
  defaultVatRate: number
}

export function SupplierOrderItemsManager({
  form,
  vatRates,
  initialProductsData = [],
  initialPackagingData = [],
  defaultVatRate, // <--- FOLOSIT MAI JOS
}: SupplierOrderItemsManagerProps) {
  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({
    control: form.control,
    name: 'products',
  })

  const {
    fields: packagingFields,
    append: appendPackaging,
    remove: removePackaging,
  } = useFieldArray({
    control: form.control,
    name: 'packagingItems',
  })

  return (
    <div className='grid grid-cols-1 xl:grid-cols-2 gap-6 w-full'>
      {/* COLOANA 1: PRODUSE */}
      <div className='flex flex-col h-full border rounded-lg bg-card/50'>
        <div className='p-4 border-b flex items-center justify-between bg-muted/20'>
          <div className='flex items-center gap-2'>
            <ShoppingCart className='h-5 w-5 text-orange-600' />
            <h3 className='font-semibold text-lg'>Produse</h3>
            <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium'>
              {productFields.length}
            </span>
          </div>
        </div>

        <div className='p-4 flex-1 space-y-4'>
          {productFields.length === 0 && (
            <div className='text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10'>
              <p>Nu există produse adăugate.</p>
            </div>
          )}

          {productFields.map((field, index) => (
            <SupplierOrderItemRow
              key={field.id}
              form={form}
              index={index}
              itemType='products'
              vatRates={vatRates}
              onRemove={() => removeProduct(index)}
              initialItemData={initialProductsData[index]}
            />
          ))}

          <Button
            type='button'
            variant='outline'
            className='w-full border-dashed h-12 hover:bg-accent hover:text-accent-foreground'
            onClick={() =>
              appendProduct({
                product: '',
                productName: '',
                quantityOrdered: 1,
                quantityReceived: 0,
                unitMeasure: '',
                pricePerUnit: 0,

                vatRate: defaultVatRate,
              })
            }
          >
            <Plus className='h-4 w-4 mr-2' /> Adaugă Produs
          </Button>
        </div>
      </div>

      {/* COLOANA 2: AMBALAJE */}
      <div className='flex flex-col h-full border rounded-lg bg-card/50'>
        <div className='p-4 border-b flex items-center justify-between bg-muted/20'>
          <div className='flex items-center gap-2'>
            <Package className='h-5 w-5 text-orange-600' />
            <h3 className='font-semibold text-lg'>Ambalaje</h3>
            <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium'>
              {packagingFields.length}
            </span>
          </div>
        </div>

        <div className='p-4 flex-1 space-y-4'>
          {packagingFields.length === 0 && (
            <div className='text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10'>
              <p>Nu există ambalaje adăugate.</p>
            </div>
          )}

          {packagingFields.map((field, index) => (
            <SupplierOrderItemRow
              key={field.id}
              form={form}
              index={index}
              itemType='packagingItems'
              vatRates={vatRates}
              onRemove={() => removePackaging(index)}
              initialItemData={initialPackagingData[index]}
            />
          ))}

          <Button
            type='button'
            variant='outline'
            className='w-full border-dashed h-12 hover:bg-accent hover:text-accent-foreground'
            onClick={() =>
              appendPackaging({
                packaging: '',
                packagingName: '',
                quantityOrdered: 1,
                quantityReceived: 0,
                unitMeasure: '',
                pricePerUnit: 0,
                vatRate: defaultVatRate,
              })
            }
          >
            <Plus className='h-4 w-4 mr-2' /> Adaugă Ambalaj
          </Button>
        </div>
      </div>
    </div>
  )
}
