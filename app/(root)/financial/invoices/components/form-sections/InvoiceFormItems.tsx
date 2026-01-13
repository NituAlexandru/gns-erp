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
import { formatCurrency, round2 } from '@/lib/utils'
import { PlusCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { InvoiceFormManualRow } from './InvoiceFormManualRow'
import { getEFacturaUomCode } from '@/lib/constants/uom.constants'
import { UNITS } from '@/lib/constants'
import { InvoiceFormProductRow } from './mini-components/InvoiceFormProductRow'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SearchedService } from '@/lib/db/modules/setting/services/types'
import { useState } from 'react'
import { toast } from 'sonner'
import { AddDiscountDialog } from './AddDiscountDialog'

interface InvoiceFormItemsProps {
  fields: FieldArrayWithId<InvoiceInput, 'items', 'id'>[]
  remove: (index: number) => void
  append: (item: InvoiceLineInput) => void
  loadedNotes: { id: string; ref: string }[]
  onRemoveNote: (noteId: string) => void
  vatRates: VatRateDTO[]
  services: SearchedService[]
  onShowStornoModal: () => void
  loadedStornoSources: { id: string; ref: string }[]
  onRemoveStornoSource: (invoiceId: string) => void
  onShowStornoProductModal: () => void
  isVatDisabled: boolean
}

export function InvoiceFormItems({
  fields,
  remove,
  append,
  loadedNotes,
  onRemoveNote,
  vatRates,
  services,
  onShowStornoModal,
  loadedStornoSources,
  onRemoveStornoSource,
  onShowStornoProductModal,
  isVatDisabled,
}: InvoiceFormItemsProps) {
  const form = useFormContext<InvoiceInput>()
  const totals = form.watch('totals')
  const watchedInvoiceType = form.watch('invoiceType')
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  const handleManualAdd = () => {
    const defaultUnit: string = UNITS[0] || 'bucata'
    const defaultVat: number = isVatDisabled ? 0 : vatRates[0]?.rate || 21
    const initialQuantity = watchedInvoiceType === 'STORNO' ? -1 : 1

    append({
      productName: '',
      productCode: 'MANUAL',
      quantity: initialQuantity,
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
      quantityInBaseUnit: initialQuantity,
      priceInBaseUnit: 0,
      lineCostFIFO: 0, // Costul e 0
      lineProfit: 0, // Profitul e 0
      lineMargin: 0, // Marja e 0
      isManualEntry: true,
      costBreakdown: [],
      stornedQuantity: 0,
      relatedAdvanceId: undefined,
    })
  }
  const handleSelectService = (service: SearchedService) => {
    const vat = vatRates.find((v) => v._id === service.vatRateId)
    const defaultVat = vatRates[0]
    let vatRate = vat ? vat.rate : defaultVat ? defaultVat.rate : 21
    if (isVatDisabled) {
      vatRate = 0
    }
    const initialQuantity = watchedInvoiceType === 'STORNO' ? -1 : 1

    // --- Logica de Cost/Profit CORECTATĂ (pe baza Pas 1 și 2) ---
    const lineValue = service.price // Prețul de vânzare
    const lineCost = service.cost // Costul real preluat din BD

    const totalValue = round2(lineValue * initialQuantity)
    const totalCost = round2(lineCost * initialQuantity)
    const lineProfit = round2(totalValue - totalCost)

    const lineMargin =
      totalValue !== 0 ? round2((lineProfit / totalValue) * 100) : 0

    const lineVatValue = round2(totalValue * (vatRate / 100))
    const lineTotal = round2(totalValue + lineVatValue)

    append({
      // Câmpuri specifice Serviciului
      serviceId: service._id.toString(),
      isManualEntry: false,
      productName: service.name,
      productCode: service.code,
      unitOfMeasure: service.unitOfMeasure,
      unitOfMeasureCode: getEFacturaUomCode(service.unitOfMeasure),
      unitPrice: service.price,
      minimumSalePrice: service.price,
      stockableItemType: 'Service',

      quantity: initialQuantity,
      quantityInBaseUnit: initialQuantity,
      baseUnit: service.unitOfMeasure,
      conversionFactor: 1,
      priceInBaseUnit: service.price,

      // Câmpuri de Totaluri
      lineValue: totalValue,
      vatRateDetails: { rate: vatRate, value: lineVatValue },
      lineTotal: lineTotal,

      // Câmpuri de Cost/Profit
      lineCostFIFO: lineCost,
      lineProfit: lineProfit,
      lineMargin: lineMargin,
      costBreakdown: [],

      // Câmpuri Nule/Goale
      sourceDeliveryNoteId: undefined,
      sourceDeliveryNoteLineId: undefined,
      productId: undefined,
      codNC: undefined,
      packagingOptions: [],
      stornedQuantity: 0,
      relatedAdvanceId: undefined,
    })
  }

  const handleConfirmDiscount = (data: {
    description: string
    amount: number
    vatRate: number
  }) => {
    const effectiveVatRate = isVatDisabled ? 0 : data.vatRate
    const discountValue = -Math.abs(data.amount)
    const discountVatValue = round2(discountValue * (data.vatRate / 100))
    const discountTotal = round2(discountValue + discountVatValue)

    append({
      isManualEntry: true,
      productName: data.description,
      productCode: 'DISCOUNT',
      quantity: 1,
      unitOfMeasure: 'bucata',
      unitOfMeasureCode: 'H87',
      unitPrice: discountValue,
      lineValue: discountValue,
      vatRateDetails: {
        rate: effectiveVatRate,
        value: discountVatValue,
      },
      lineTotal: discountTotal,
      stockableItemType: 'Service',
      baseUnit: 'bucata',
      conversionFactor: 1,
      quantityInBaseUnit: 1,
      priceInBaseUnit: discountValue,
      lineCostFIFO: 0,
      lineProfit: discountValue,
      lineMargin: 0,
      costBreakdown: [],
      minimumSalePrice: 0,
      packagingOptions: [],
      stornedQuantity: 0,
      relatedAdvanceId: undefined,
    })

    toast.success('Discount adăugat cu succes!')
  }

  if (fields.length === 0) {
    return (
      <div className='border rounded-lg p-8 bg-card text-center space-y-4'>
        {watchedInvoiceType === 'STANDARD' ? (
          <>
            {/* --- 1. Mesajul pentru STANDARD --- */}
            <p className='text-muted-foreground'>
              Factura nu conține linii. Te rog folosește butonul{' '}
              <strong>Încarcă Avize Nefacturate</strong> (din antet) pentru a
              adăuga produse/servicii <strong>sau</strong> <br /> Folosește
              butoanele de mai jos pentru a adăuga manual o descriere și o
              valoare.
            </p>
            {/* Afișăm ambele butoane și pentru Standard */}
            <div className='flex justify-center gap-4'>
              <Button type='button' onClick={handleManualAdd} variant='outline'>
                <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Rând Manual
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type='button' variant='outline'>
                    <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Serviciu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-[450px]'>
                  {services.map((service: SearchedService) => (
                    <DropdownMenuItem
                      key={service._id}
                      onSelect={() => handleSelectService(service)}
                    >
                      <span>
                        {service.name} ({formatCurrency(service.price)})
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type='button'
                variant='outline'
                onClick={() => setShowDiscountModal(true)}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Discount
              </Button>
            </div>
          </>
        ) : watchedInvoiceType === 'AVANS' ? (
          <>
            {/* --- 2. Mesajul pentru AVANS --- */}
            <p className='text-muted-foreground'>
              Aceasta este o factură de avans si nu poti incarca avize. <br />
              Folosește butoanele de mai jos pentru a adăuga manual o descriere
              și o valoare.
            </p>
            {/* Butoanele pentru Avans */}
            <div className='flex justify-center gap-4'>
              <Button type='button' onClick={handleManualAdd} variant='outline'>
                <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Rând Manual
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type='button' variant='outline'>
                    <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Serviciu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-[450px]'>
                  {services.map((service: SearchedService) => (
                    <DropdownMenuItem
                      key={service._id}
                      onSelect={() => handleSelectService(service)}
                    >
                      <span>
                        {service.name} ({formatCurrency(service.price)})
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          // --- 3. Cazul NOU pentru STORNO ---
          <>
            <p className='text-muted-foreground'>
              Acesta este un formular de <strong>Stornare</strong>. Poți anula
              (storna) doar linii din facturi care au fost deja finalizate (cu
              statusul <strong>Aprobat</strong> sau <strong>Plătit</strong>).{' '}
              <br />
              <span>
                (Facturile cu statusul <strong>Creată</strong> trebuie anulate
                sau editate, nu stornate.)
              </span>
            </p>
            <div className='flex justify-center gap-4'>
              <Button type='button' variant='outline' onClick={handleManualAdd}>
                <PlusCircle className='mr-2 h-4 w-4' />
                Adaugă Rând Manual
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={onShowStornoModal}
              >
                <PlusCircle className='mr-2 h-4 w-4' />
                Selectează Facturi de Stornat
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={onShowStornoProductModal}
              >
                Selectează Produse
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type='button' variant='outline'>
                    <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Serviciu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-[450px]'>
                  {services.map((service: SearchedService) => (
                    <DropdownMenuItem
                      key={service._id}
                      onSelect={() => handleSelectService(service)}
                    >
                      <span>
                        {service.name} ({formatCurrency(service.price)})
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
        <AddDiscountDialog
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          onConfirm={handleConfirmDiscount}
          currentSubtotal={totals?.subtotal || 0}
          vatRates={vatRates}
        />
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
        {loadedStornoSources.length > 0 && (
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm text-destructive-foreground'>
              Stornare Facturi:
            </span>
            {loadedStornoSources.map((inv) => (
              <Badge
                key={inv.id}
                variant='destructive'
                className='flex items-center gap-1'
              >
                <span>{inv.ref}</span>

                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 -mr-1 text-destructive-foreground hover:text-destructive-foreground/70'
                  onClick={() => onRemoveStornoSource(inv.id)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      {watchedInvoiceType === 'STORNO' && (
        <div className='flex gap-4 '>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleManualAdd}
          >
            <PlusCircle className='mr-2 h-4 w-4' />
            Adaugă Rând Manual
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onShowStornoModal}
          >
            <PlusCircle className='mr-2 h-4 w-4' />
            Adaugă Factură
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onShowStornoProductModal}
          >
            <PlusCircle className='mr-2 h-4 w-4' />
            Adaugă Produs
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' size='sm'>
                <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Serviciu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[450px]'>
              {services.map((service: SearchedService) => (
                <DropdownMenuItem
                  key={service._id}
                  onSelect={() => handleSelectService(service)}
                >
                  <span>
                    {service.name} ({formatCurrency(service.price)})
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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
              <TableHead className='w-[40px] p-2'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = field as unknown as InvoiceLineInput
              const isManualRow =
                item.productCode === 'MANUAL' || item.productCode === 'DISCOUNT'

              if (isManualRow) {
                return (
                  <InvoiceFormManualRow
                    key={field.id}
                    index={index}
                    remove={remove}
                    vatRates={vatRates}
                    isVatDisabled={isVatDisabled}
                  />
                )
              } else {
                return (
                  <InvoiceFormProductRow
                    key={field.id}
                    index={index}
                    itemData={item}
                    remove={remove}
                    isVatDisabled={isVatDisabled}
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

      {/* 🔽 --- AICI SUNT BUTOANELE CONDIȚIONATE --- 🔽 */}
      {watchedInvoiceType !== 'STORNO' && (
        <div className='flex gap-2'>
          <Button
            type='button'
            onClick={handleManualAdd}
            variant='secondary'
            size='sm'
          >
            <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Rând Manual
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' size='sm'>
                <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Serviciu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-[450px]'>
              {services.map((service: SearchedService) => (
                <DropdownMenuItem
                  key={service._id}
                  onSelect={() => handleSelectService(service)}
                >
                  <span>
                    {service.name} ({formatCurrency(service.price)})
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setShowDiscountModal(true)}
          >
            <PlusCircle className='mr-2 h-4 w-4' /> Adaugă Discount
          </Button>
        </div>
      )}
      <AddDiscountDialog
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onConfirm={handleConfirmDiscount}
        currentSubtotal={totals?.subtotal || 0}
        vatRates={vatRates}
      />
    </div>
  )
}
