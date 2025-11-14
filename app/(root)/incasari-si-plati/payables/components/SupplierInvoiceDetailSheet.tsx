'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getSupplierInvoiceById } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import {
  ISupplierInvoiceDoc,
  SupplierSnapshot,
  OurCompanySnapshot,
  IFiscalAddress,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { SUPPLIER_INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getInvoiceAllocationHistory, PopulatedInvoiceAllocationHistory } from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'

interface SupplierInvoiceDetailSheetProps {
  invoiceId: string | null
  onClose: () => void
}

interface AddressDisplayProps {
  snapshot: SupplierSnapshot | OurCompanySnapshot
  title: string
}

function AddressDisplay({ snapshot, title }: AddressDisplayProps) {
  const address = snapshot.address as IFiscalAddress

  if (!address) return null

  const displayAddress = `${address.strada || ''} ${address.numar || ''}, ${address.localitate || ''}, ${address.judet || ''}, ${address.tara || ''}`

  const hasBankDetails =
    'bank' in snapshot && snapshot.bank && 'iban' in snapshot && snapshot.iban

  return (
    <div className='space-y-1'>
      <h4 className='font-semibold text-sm border-b pb-1 text-muted-foreground'>
        {title}
      </h4>
      <p className='font-medium'>{snapshot.name}</p>
      <p className='text-xs'>CUI: {snapshot.cui || 'N/A'}</p>
      <p className='text-xs'>Reg. Com.: {snapshot.regCom || 'N/A'}</p>
      <div className='text-xs pt-1'>
        <p>{displayAddress}</p>
        {address.alteDetalii && <p>Detalii: {address.alteDetalii}</p>}
      </div>
      {hasBankDetails && (
        <div className='text-xs pt-2'>
          <p className='font-medium'>Bancă: {snapshot.bank}</p>
          <p className='font-medium'>IBAN: {snapshot.iban}</p>
        </div>
      )}
    </div>
  )
}


export function SupplierInvoiceDetailSheet({
  invoiceId,
  onClose,
}: SupplierInvoiceDetailSheetProps) {
  const [invoice, setInvoice] = useState<ISupplierInvoiceDoc | null>(null)
  const [history, setHistory] = useState<PopulatedInvoiceAllocationHistory[]>(
    []
  ) 
  const [isLoading, setIsLoading] = useState(false)
  const isOpen = !!invoiceId

  useEffect(() => {
    if (invoiceId) {
      const fetchData = async () => {
        setIsLoading(true)

        // Apelăm ambele funcții în paralel
        const [invoiceResult, historyResult] = await Promise.all([
          getSupplierInvoiceById(invoiceId),
          getInvoiceAllocationHistory(invoiceId),
        ])

        if (invoiceResult.success && invoiceResult.data) {
          setInvoice(invoiceResult.data as ISupplierInvoiceDoc)
        } else {
          toast.error('Eroare la preluarea facturii.', {
            description: invoiceResult.message,
          })
          setInvoice(null)
          onClose()
        }

        if (historyResult.success) {
        
          setHistory(historyResult.data as PopulatedInvoiceAllocationHistory[])
        } else {
         toast.error('Eroare la preluarea istoricului de plăți.', {
            description: historyResult.message,
          })
        }

        setIsLoading(false)
      }
      fetchData()
    } else {
      setInvoice(null)
      setHistory([])
    }
  }, [invoiceId, onClose])

  // Handler pentru a formata datele
  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  // Funcție defensivă pentru a extrage numele furnizorului
  const getSupplierName = () => {
    if (!invoice) return 'N/A'
    return invoice.supplierSnapshot.name || 'Furnizor Necunoscut'
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='sm:max-w-4xl w-full overflow-y-auto p-6'>
        <SheetHeader className='p-0'>
          <SheetTitle>
            Detalii Factură:{' '}
            {isLoading
              ? 'Încărcare...'
              : `${invoice?.invoiceSeries || 'F-'} - ${invoice?.invoiceNumber}`}
          </SheetTitle>
          <SheetDescription>
            Document de la{' '}
            <span className='font-semibold'>{getSupplierName()}</span>
          </SheetDescription>
        </SheetHeader>

        <div className='py-6 space-y-6'>
          {isLoading ? (
            <Loader2 className='h-6 w-6 animate-spin mx-auto' />
          ) : invoice ? (
            <>
              {/* --- SECȚIUNEA 1: PĂRȚILE IMPLICATE ȘI DATELE GENERALE --- */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b'>
                {/* 1. Detalii Companie (NOASTRA) */}
                <AddressDisplay
                  snapshot={invoice.ourCompanySnapshot}
                  title='Cumpărător (Noi)'
                />

                {/* 2. Detalii Furnizor */}
                <AddressDisplay
                  snapshot={invoice.supplierSnapshot}
                  title='Furnizor'
                />
              </div>
              {/* 3. Status și Date Cheie */}
              <div className='space-y-1 pt-0'>
                <div className='text-sm flex justify-between'>
                  <span className='font-medium'>Status:</span>
                  <Badge
                    variant={
                      SUPPLIER_INVOICE_STATUS_MAP[invoice.status]?.variant ||
                      'outline'
                    }
                  >
                    {SUPPLIER_INVOICE_STATUS_MAP[invoice.status]?.name ||
                      'Necunoscut'}
                  </Badge>
                </div>
                <div className='text-sm flex justify-between'>
                  <span className='font-medium'>Data Facturii:</span>
                  <span className='font-medium'>
                    {formatDate(invoice.invoiceDate)}
                  </span>
                </div>
                <div className='text-sm flex justify-between'>
                  <span className='font-medium'>Data Scadenței:</span>
                  <span className='font-medium text-red-500'>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                <div className='text-sm flex justify-between'>
                  <span className='font-medium'>Plată înregistrată:</span>
                  <span className='font-medium'>
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>
              </div>
              {/* --- SECȚIUNEA 2: LINI L FACTURII --- */}
              <h3 className='text-lg font-bold'>
                Linii Factură ({invoice.items.length})
              </h3>

              <div className='rounded-md border overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/50 text-xs uppercase'>
                      <TableHead className='w-[40%]'>Produs/Serviciu</TableHead>
                      <TableHead className='w-[10%] text-right'>UM</TableHead>
                      <TableHead className='w-[10%] text-right'>
                        Cant.
                      </TableHead>
                      <TableHead className='w-[15%] text-right'>
                        Preț Unitar (fără TVA)
                      </TableHead>
                      <TableHead className='w-[10%] text-right'>TVA</TableHead>
                      <TableHead className='w-[15%] text-right font-semibold'>
                        Total Linie (cu TVA)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item, index) => (
                      <TableRow key={index} className='text-sm'>
                        <TableCell className='font-medium'>
                          {item.productName}
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.unitOfMeasure}
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.quantity}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.vatRateDetails.rate}%
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {formatCurrency(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* --- SECȚIUNEA 3: ISTORIC PLĂȚI --- */}
              <h3 className='text-lg font-bold border-t pt-4'>
                Istoric Plăți ({history.length})
              </h3>

              {history.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  Nu s-au înregistrat alocări pentru această factură.
                </p>
              ) : (
                <div className='rounded-md border overflow-hidden'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-muted/50 text-xs uppercase'>
                        <TableHead className='w-[20%]'>Dată Alocare</TableHead>
                        <TableHead className='w-[35%]'>
                          Plată Sursă (Nr./Serie)
                        </TableHead>
                        <TableHead className='w-[20%] text-right'>
                          Sumă Alocată
                        </TableHead>
                        <TableHead className='w-[25%]'>
                          Înregistrat de
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((alloc) => (
                        <TableRow key={alloc._id}>
                          <TableCell>
                            {formatDate(alloc.allocationDate)}
                          </TableCell>
                          <TableCell>
                            {alloc.paymentId.seriesName} -{' '}
                            {alloc.paymentId.paymentNumber}
                          </TableCell>
                          <TableCell className='text-right font-medium text-green-600'>
                            {formatCurrency(alloc.amountAllocated)}
                          </TableCell>
                          <TableCell>{alloc.createdByName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* --- SECȚIUNEA 4: TOTALURI ȘI NOTE --- */}
              <div className='grid grid-cols-2 gap-6'>
                {/* Coloana Stanga: Notițe */}
                <div className='space-y-2'>
                  <h4 className='font-semibold text-sm text-muted-foreground'>
                    Notițe Factură
                  </h4>
                  <p className='text-sm p-3 border rounded-md bg-muted min-h-[50px]'>
                    {invoice.notes || 'Nicio notiță specificată.'}
                  </p>
                </div>

                {/* Coloana Dreapta: Totaluri */}
                <div className='space-y-1 text-right text-sm'>
                  <div className='flex justify-between'>
                    <span>Subtotal (fără TVA):</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.totals.subtotal)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>TVA Total:</span>
                    <span className='font-medium'>
                      {formatCurrency(invoice.totals.vatTotal)}
                    </span>
                  </div>
                  <div className='border-t pt-2 mt-2 flex justify-between'>
                    <span className='text-lg font-bold'>TOTAL GENERAL:</span>
                    <span className='text-lg font-bold text-primary'>
                      {formatCurrency(invoice.totals.grandTotal)}
                    </span>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Creată de: {invoice.createdByName} la{' '}
                    {formatDate(invoice.createdAt)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className='text-center text-muted-foreground'>
              Factura nu poate fi afișată.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
