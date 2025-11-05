'use client'

import { useFormContext, FieldArrayWithId } from 'react-hook-form'
import {
  InvoiceInput,
  InvoiceLineInput,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { PlusCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { InvoiceFormManualRow } from './InvoiceFormManualRow'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'
import { UNITS } from '@/lib/constants'
import { InvoiceFormProductRow } from './mini-components/InvoiceFormProductRow'
import { Badge } from '@/components/ui/badge'

interface InvoiceFormItemsProps {
  fields: FieldArrayWithId<InvoiceInput, 'items', 'id'>[]
  remove: (index: number) => void
  append: (item: InvoiceLineInput) => void
  loadedNotes: { id: string; ref: string }[]
  onRemoveNote: (noteId: string) => void
  vatRates: VatRateDTO[]
}

export function InvoiceFormItems({
  fields,
  remove,
  append,
  loadedNotes,
  onRemoveNote,
  vatRates,
}: InvoiceFormItemsProps) {
  const form = useFormContext<InvoiceInput>()
  const totals = form.watch('totals')

  const handleManualAdd = () => {
    const defaultUnit: string = UNITS[0] || 'bucata'
    const defaultVat: number = vatRates[0]?.rate || 21
    append({
      productName: '',
      productCode: 'MANUAL', 
      quantity: 1,
      unitOfMeasure: defaultUnit,
      unitOfMeasureCode: getEFacturaUomCode(defaultUnit),
      unitPrice: 0,
      lineValue: 0,
      lineTotal: 0,
      vatRateDetails: { rate: defaultVat, value: 0 },
      stockableItemType: 'Service',
      sourceDeliveryNoteId: undefined,
      sourceDeliveryNoteLineId: undefined,
      productId: undefined,
      serviceId: undefined,
      codNC: undefined,
      baseUnit: defaultUnit,
      minimumSalePrice: 0,
      packagingOptions: [],
      conversionFactor: 1,
      quantityInBaseUnit: 1,
      priceInBaseUnit: 0,
      lineCostFIFO: 0, // Costul e 0
      lineProfit: 0, // Profitul e 0
      lineMargin: 0, // Marja e 0
      isManualEntry: true,
      costBreakdown: [],
    })
  }

  if (fields.length === 0) {
    return (
      <div className='border rounded-lg p-8 bg-card text-center space-y-4'>
        <p className='text-muted-foreground'>
          Factura nu conține linii. Te rog folosește butonul{' '}
          <strong>Încarcă Avize Nefacturate</strong> (din antet) pentru a adăuga
          produse/servicii.
        </p>
        <Button onClick={handleManualAdd} variant='secondary'>
          <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Produs Manual
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-baseline justify-between'>
        <h3 className='text-lg font-semibold'>
          Linii Factură ({fields.length} articole)
        </h3>
        {loadedNotes.length > 0 && (
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm text-muted-foreground'>
              Avize incluse:
            </span>
            {loadedNotes.map((note) => (
              <Badge
                key={note.id}
                variant='secondary'
                className='flex items-center gap-1'
              >
                <span>{note.ref}</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 -mr-1 text-muted-foreground hover:text-destructive'
                  onClick={() => onRemoveNote(note.id)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className='border rounded-lg bg-card overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[40px] text-center'>Nr.</TableHead>
              <TableHead>Produs/Serviciu</TableHead>
              <TableHead className='text-right w-[120px]'>Cantitate</TableHead>
              <TableHead className='text-center w-[120px]'>UM</TableHead>
              <TableHead className='text-right w-[120px]'>
                Preț Unitar
              </TableHead>
              <TableHead className='text-right w-[120px]'>
                Valoare (fără TVA)
              </TableHead>
              <TableHead className='text-center w-[100px]'>TVA %</TableHead>
              <TableHead className='text-right w-[100px]'>TVA Sumă</TableHead>
              <TableHead className='text-right w-[150px]'>TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = field as unknown as InvoiceLineInput
              const isManualRow = item.productCode === 'MANUAL'

              if (isManualRow) {
                return (
                  <InvoiceFormManualRow
                    key={field.id}
                    index={index}
                    remove={remove}
                    vatRates={vatRates}
                  />
                )
              } else {
                return (
                  <InvoiceFormProductRow
                    key={field.id}
                    index={index}
                    itemData={item}
                  />
                )
              }
            })}

            {/* Totalurile pe rândul final */}
            <TableRow className='font-bold bg-muted/70 hover:bg-muted/70'>
              <TableCell colSpan={7} className='text-right'>
                TOTAL FACTURĂ:
              </TableCell>
              <TableCell className='text-right'>
                {formatCurrency(totals.vatTotal)}
              </TableCell>
              <TableCell className='text-right text-primary'>
                {formatCurrency(totals.grandTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Button onClick={handleManualAdd} variant='secondary' size='sm'>
        <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Rând Manual
      </Button>
    </div>
  )
}
