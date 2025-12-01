'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  ArrowLeftRight,
  FileSignature,
  FileText,
  Info,
  Loader2,
  MapPin,
  ShoppingCart,
  Truck,
} from 'lucide-react'
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
import {
  getInvoiceAllocationHistory,
  PopulatedInvoiceAllocationHistory,
} from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import {
  getInvoiceTypeName,
  getPaymentMethodName,
} from '@/lib/db/modules/setting/efactura/anaf.constants'

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
      {'capital' in snapshot && snapshot.capital && (
        <p className='text-xs text-muted-foreground'>{snapshot.capital}</p>
      )}
      <div className='text-xs pt-1'>
        <p>{displayAddress}</p>
        {address.alteDetalii && <p>Detalii: {address.alteDetalii}</p>}
      </div>
      {hasBankDetails && (
        <div className='text-xs pt-2'>
          <p className='font-medium'>Bancă: {snapshot.bank}</p>
          <p className='font-medium'>IBAN: {snapshot.iban}</p>
          {'bic' in snapshot && snapshot.bic && (
            <span className='text-muted-foreground'>(BIC: {snapshot.bic})</span>
          )}
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
      <SheetContent className='sm:max-w-5xl w-full overflow-y-auto p-6'>
        <SheetHeader className='p-0'>
          <SheetTitle>
            Detalii Factură{' '}
            {isLoading
              ? 'Încărcare...'
              : `Seria ${invoice?.invoiceSeries || 'F-'} nr. ${invoice?.invoiceNumber}`}
            {!isLoading && invoice && (
              <span className='ml-1'>
                {invoice.invoiceType === 'STORNO'
                  ? '- Storno'
                  : getInvoiceTypeName(invoice.invoiceTypeCode) || '- Standard'}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            <span className='flex flex-col gap-1 text-foreground'>
              <span>
                Document de la{' '}
                <span className='font-semibold'>{getSupplierName()}</span>
              </span>

              {invoice?.eFacturaXMLId && (
                <span>ID Descarcare din SPV: {invoice.eFacturaXMLId}</span>
              )}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className='py-6 space-y-6'>
          {isLoading ? (
            <Loader2 className='h-6 w-6 animate-spin mx-auto' />
          ) : invoice ? (
            <>
              {/* PĂRȚILE IMPLICATE ȘI DATELE GENERALE --- */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 border-b'>
                {/*  Detalii Companie (NOASTRA) */}
                <AddressDisplay
                  snapshot={invoice.ourCompanySnapshot}
                  title='Cumpărător (Noi)'
                />

                {/* SECȚIUNE REFERINȚE --- */}
                <div className='bg-muted/30 border rounded-lg p-2 grid grid-cols-1 gap-y-1 '>
                  <div className='flex items-center gap-2 text-sm'>
                    <FileText className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      Tip Factură:
                    </span>
                    <div className='flex items-center gap-2'>
                      {invoice.invoiceType === 'STORNO' ? (
                        <span className='h-5  '>Storno</span>
                      ) : (
                        <span className='h-5 '>Standard</span>
                      )}

                      {invoice.invoiceTypeCode && (
                        <span
                          className='font-medium text-xs truncate max-w-[120px]'
                          title={getInvoiceTypeName(invoice.invoiceTypeCode)}
                        >
                          {getInvoiceTypeName(invoice.invoiceTypeCode)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contract */}
                  <div className='flex items-center gap-2 text-sm'>
                    <FileSignature className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      Contract:
                    </span>
                    <span className='font-medium'>
                      {invoice.references?.contract || '-'}
                    </span>
                  </div>

                  {/* Comandă Client */}
                  <div className='flex items-center gap-2 text-sm'>
                    <ShoppingCart className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      Comandă Client:
                    </span>
                    <span className='font-medium'>
                      {invoice.references?.order || '-'}
                    </span>
                  </div>

                  {/* Comandă Vânzare */}
                  <div className='flex items-center gap-2 text-sm'>
                    <ShoppingCart className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      Comandă Vânz.:
                    </span>
                    <span className='font-medium'>
                      {invoice.references?.salesOrder || '-'}
                    </span>
                  </div>

                  {/* Aviz */}
                  <div className='flex items-center gap-2 text-sm'>
                    <Truck className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>Aviz:</span>
                    <span className='font-medium'>
                      {invoice.references?.despatch || '-'}
                    </span>
                  </div>

                  {/* ID Locație */}
                  <div className='flex items-center gap-2 text-sm'>
                    <MapPin className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      ID Locație:
                    </span>
                    <span className='font-medium'>
                      {invoice.references?.deliveryLocationId || '-'}
                    </span>
                  </div>

                  {/* Destinatar */}
                  <div className='flex items-center gap-2 text-sm'>
                    <MapPin className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      Destinatar:
                    </span>
                    <span
                      className='font-medium truncate'
                      title={invoice.references?.deliveryPartyName}
                    >
                      {invoice.references?.deliveryPartyName || '-'}
                    </span>
                  </div>

                  {/* Cost Center / Buyer Ref */}
                  <div className='flex items-center gap-2 text-sm'>
                    <Info className='h-4 w-4 text-muted-foreground' />
                    <span className='text-muted-foreground w-30'>
                      Ref. Cumparator:
                    </span>
                    <span className='font-medium'>
                      {invoice.buyerReference || '-'}
                    </span>
                  </div>
                </div>

                {/* Detalii Furnizor */}
                <AddressDisplay
                  snapshot={invoice.supplierSnapshot}
                  title='Furnizor'
                />
              </div>
              {/* Status și Date Cheie */}
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
                {/* Data Exigibilității (Tax Point) - Afișată DOAR dacă există */}
                {invoice.taxPointDate && (
                  <div className='text-sm flex justify-between'>
                    <span className='font-medium'>Exigibilitate TVA:</span>
                    <span className='font-medium'>
                      {formatDate(invoice.taxPointDate)}
                    </span>
                  </div>
                )}

                {/* Perioada Facturare - Afișată DOAR dacă există */}
                {invoice.invoicePeriod && invoice.invoicePeriod.startDate && (
                  <div className='text-sm flex justify-between'>
                    <span className='font-medium'>Perioada de facturare:</span>
                    <span className='font-medium'>
                      {formatDate(invoice.invoicePeriod.startDate)} -{' '}
                      {formatDate(invoice.invoicePeriod.endDate)}
                    </span>
                  </div>
                )}
                {invoice.references?.actualDeliveryDate && (
                  <div className='text-sm flex justify-between'>
                    <span className='font-medium'>Data Livrării:</span>
                    <span className='font-medium'>
                      {formatDate(invoice.references.actualDeliveryDate)}
                    </span>
                  </div>
                )}

                {/* Referință Storno (NOU) */}
                {invoice.references?.billingReference && (
                  <div className='mt-2 pt-2 border-t border-dashed'>
                    <div className='text-sm flex items-center gap-1 text-orange-600 font-semibold'>
                      <ArrowLeftRight className='h-3 w-3' /> Factură Stornată:
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Seria{' '}
                      {invoice.references.billingReference.oldInvoiceNumber}
                      {invoice.references.billingReference.oldInvoiceDate &&
                        ` din ${formatDate(invoice.references.billingReference.oldInvoiceDate)}`}
                    </div>
                  </div>
                )}
                <div className='text-sm flex justify-between'>
                  <span className='font-medium'>Plată înregistrată:</span>
                  <span className='font-medium'>
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>
              </div>
              {/* LINI L FACTURII --- */}
              <h3 className='text-lg font-bold'>
                Linii Factură ({invoice.items.length})
              </h3>

              <div className='rounded-md border overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/50 text-xs uppercase'>
                      <TableHead className='w-[35%]'>Produs/Serviciu</TableHead>
                      <TableHead className='w-[5%] text-right'>UM</TableHead>
                      <TableHead className='w-[10%] text-right'>
                        Cant.
                      </TableHead>
                      <TableHead className='w-[15%] text-right'>
                        Preț Unitar
                      </TableHead>
                      <TableHead className='w-[5%] text-right'>TVA %</TableHead>
                      <TableHead className='w-[15%] text-right font-bold'>
                        Valoare (fără TVA)
                      </TableHead>
                      <TableHead className='w-[15%] text-right'>
                        Valoare TVA
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item, index) => (
                      <TableRow key={index} className='text-sm'>
                        <TableCell className='font-medium'>
                          {item.productName}
                          {item.description && (
                            <div className='text-[11px] text-muted-foreground leading-tight mt-0.5'>
                              {item.description}
                            </div>
                          )}
                          {item.cpvCode && (
                            <div className='text-[10px] text-muted-foreground/70 mt-0.5'>
                              CPV: {item.cpvCode}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.unitOfMeasure}
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.quantity}
                        </TableCell>

                        {/* Preț Unitar + Base Quantity */}
                        <TableCell className='text-right'>
                          <div className='flex flex-col items-end'>
                            <span>{formatCurrency(item.unitPrice)}</span>
                            {item.baseQuantity && item.baseQuantity > 1 && (
                              <span className='text-[10px] text-muted-foreground'>
                                per {item.baseQuantity} {item.unitOfMeasure}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className='text-right'>
                          {item.vatRateDetails.rate}%
                        </TableCell>

                        {/* Valoare Fără TVA (Net) + Discount */}
                        <TableCell className='text-right font-bold'>
                          <div className='flex flex-col items-end'>
                            <span>{formatCurrency(item.lineValue)}</span>
                            {item.allowanceAmount &&
                            item.allowanceAmount > 0 ? (
                              <span className='text-[10px] text-green-600 font-normal'>
                                (Disc. {formatCurrency(item.allowanceAmount)})
                              </span>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* Valoare TVA */}
                        <TableCell className='text-right'>
                          {formatCurrency(item.vatRateDetails.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/*  ISTORIC PLĂȚI --- */}
              <h3 className='text-lg font-bold border-t pt-4'>
                Istoric Plăți ({history.length})
              </h3>
              {/*  */}
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
              {/* ---  TOTALURI ȘI NOTE --- */}
              <div className='grid grid-cols-2 gap-6'>
                {/* Coloana Stanga: Notițe */}
                <div className='space-y-2'>
                  <h4 className='font-semibold  mb-1 text-sm flex items-center gap-2'>
                    <Info className='h-4 w-4' /> Note / Mențiuni
                  </h4>
                  <p className='text-sm p-3 border rounded-md bg-muted min-h-[50px] whitespace-pre-wrap'>
                    {invoice.notes || 'Nicio notiță specificată.'}
                  </p>

                  {/* COLOANA DE JOS: Mentiuni Termeni de Plata  */}
                  <h4 className='font-semibold text-sm flex justify-items-normal gap-2 align-middle text-muted-foreground mt-4'>
                    <Info className='h-4 w-4' /> Mențiuni Termeni de Plată
                  </h4>
                  <p className='text-sm p-3 border rounded-md bg-muted min-h-[50px]'>
                    {invoice.paymentTermsNote ||
                      'Nu există mențiuni de plată salvate.'}
                  </p>
                </div>

                {/* Coloana Dreapta: Totaluri */}
                <div className='space-y-1 text-right text-sm min-w-[250px]'>
                  {/* Defalcare TVA */}
                  {invoice.taxSubtotals && invoice.taxSubtotals.length > 0 ? (
                    <div className='text-xs text-muted-foreground my-1 border-b border-dashed pb-2 mb-2'>
                      <div className='font-semibold text-muted-foreground mb-1'>
                        Defalcare TVA:
                      </div>
                      {invoice.taxSubtotals.map((sub, i) => (
                        <div key={i} className='flex justify-between gap-4'>
                          <span className='text-left'>
                            Cota TVA: {sub.percent}% ({sub.categoryCode})
                          </span>

                          <div className='flex gap-2'>
                            <span>
                              <span className='text-muted-foreground'>
                                Bază:
                              </span>{' '}
                              {formatCurrency(sub.taxableAmount)}
                            </span>
                            <span>
                              <span className='text-muted-foreground'>
                                TVA:
                              </span>{' '}
                              {formatCurrency(sub.taxAmount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Fallback: Afișăm TVA Total simplu
                    <div className='flex justify-between'>
                      <span>TVA Total:</span>
                      <span className='font-medium'>
                        {formatCurrency(invoice.totals.vatTotal)}
                      </span>
                    </div>
                  )}

                  {/*  Discount Global - Se afișează DOAR dacă există și e > 0 */}
                  {invoice.totals.globalDiscount &&
                  invoice.totals.globalDiscount > 0 ? (
                    <div className='flex justify-between text-green-600'>
                      <span>Discount Global:</span>
                      <span className='font-bold'>
                        -{formatCurrency(invoice.totals.globalDiscount)}
                      </span>
                    </div>
                  ) : null}

                  {/*  Avans Achitat - Se afișează DOAR dacă există și e > 0 */}
                  {invoice.totals.prepaidAmount &&
                  invoice.totals.prepaidAmount > 0 ? (
                    <div className='flex justify-between text-blue-600 border-b pb-1 mb-1'>
                      <span>Avans Achitat:</span>
                      <span className='font-bold'>
                        -{formatCurrency(invoice.totals.prepaidAmount)}
                      </span>
                    </div>
                  ) : null}

                  {/* Metoda de Plată */}
                  {invoice.paymentMethodCode && (
                    <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                      <span>Metoda de plată:</span>
                      <span className='font-medium text-foreground'>
                        {getPaymentMethodName(invoice.paymentMethodCode)}
                      </span>
                    </div>
                  )}

                  {/* Curs Valutar - Corectat să nu afișeze 0 */}
                  {(invoice.exchangeRate || 0) > 0 && (
                    <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                      <span>Curs Valutar:</span>
                      <span className='font-medium text-foreground'>
                        {invoice.exchangeRate}
                      </span>
                    </div>
                  )}
                  {/* DE PLATĂ (Final) */}
                  <div className='border-t pt-2 mt-2 flex justify-between items-baseline'>
                    <span className='text-lg font-bold'>DE PLATĂ:</span>
                    <div className='text-right'>
                      <span className='text-lg font-bold text-primary'>
                        {formatCurrency(
                          invoice.totals.payableAmount ??
                            invoice.totals.grandTotal
                        )}
                      </span>
                      {/* Moneda Explicită */}
                      <span className='text-sm font-medium text-muted-foreground ml-1'>
                        {invoice.invoiceCurrency}
                      </span>
                    </div>
                  </div>

                  {/*  Total Factură Brut (Vizibil mereu) */}
                  <div className='text-xs text-muted-foreground'>
                    (Total Factură Brut:{' '}
                    {formatCurrency(invoice.totals.grandTotal)})
                  </div>

                  <p className='text-xs text-muted-foreground mt-4'>
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
