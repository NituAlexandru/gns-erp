'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ParsedAnafInvoice } from '@/lib/db/modules/setting/efactura/anaf.types'
import { formatCurrency } from '@/lib/utils'
import {
  FileText,
  Landmark,
  Truck,
  FileSignature,
  ShoppingCart,
  Calendar,
  Building2,
  MapPin,
  Info,
  Phone,
  Mail,
  User,
  ArrowLeftRight,
} from 'lucide-react'
import { getPaymentMethodName } from '@/lib/db/modules/setting/efactura/anaf.constants'

interface AnafPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  data: ParsedAnafInvoice | null
}

export function AnafPreviewModal({
  isOpen,
  onClose,
  data,
}: AnafPreviewModalProps) {
  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[90vw] w-full max-h-[95vh] overflow-y-auto'>
        <DialogHeader className='border-b pb-1 '>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <FileText className='h-6 w-6 ' />
            Previzualizare Factură ANAF (XML)
          </DialogTitle>
          <DialogDescription className='text-muted-foreground text-xs'>
            Detalii complete extrase din fișierul XML (UBL) descărcat de la
            ANAF.
          </DialogDescription>
        </DialogHeader>

        {/* --- ZONA SUPERIOARĂ: FURNIZOR vs CLIENT vs DETALII --- */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
          {/* FURNIZOR */}
          <div className='space-y-1 border rounded-lg p-4'>
            <div className='flex items-center gap-2 font-semibold border-b pb-2'>
              <Building2 className='h-4 w-4' /> FURNIZOR
            </div>

            {/* Date Identificare */}
            <div>
              <div className='font-bold text-xl'>
                {data.supplierName || '-'}
              </div>
              <div className='flex items-center gap-2 mt-1'>
                <span className='text-muted-foreground'>CUI:</span>
                <span className='font-bold'>{data.supplierCui || '-'}</span>
              </div>
              {data.customerRegCom && (
                <div className='flex items-center gap-2 text-sm '>
                  <span className='text-sm text-muted-foreground'>
                    Reg. Com:
                  </span>
                  <span className='font-mono'>{data.customerRegCom}</span>
                </div>
              )}

              {/* Capital Social - Simplu */}
              {data.supplierCapital && (
                <div className='text-muted-foreground text-xs mt-1 border-t pt-1'>
                  Capital Social: {data.supplierCapital}
                </div>
              )}
            </div>

            <div className='flex items-start gap-2 text-xs text-muted-foreground'>
              <MapPin className='h-4 w-4 mt-0.5 shrink-0' />
              <div className=' w-full'>
                {/* ADRESA DEFALCATĂ (Câmpuri individuale, doar dacă există) */}
                <div className=' text-muted-foreground'>
                  {data.supplierAddressDetails.street && (
                    <span>
                      Str. &nbsp;{data.supplierAddressDetails.street},{' '}
                    </span>
                  )}
                  {data.supplierAddressDetails.number && (
                    <span>
                      Nr. &nbsp; {data.supplierAddressDetails.number},
                    </span>
                  )}
                  {data.supplierAddressDetails.city && (
                    <span>Loc. &nbsp;{data.supplierAddressDetails.city},</span>
                  )}
                  {data.supplierAddressDetails.county && (
                    <span>
                      &nbsp; Jud. &nbsp;{data.supplierAddressDetails.county},
                    </span>
                  )}
                  {data.supplierAddressDetails.zip && (
                    <span>
                      Cod Postal &nbsp;{data.supplierAddressDetails.zip}
                    </span>
                  )}{' '}
                  {data.supplierAddressDetails.country && (
                    <span>{data.supplierAddressDetails.country}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className='mt-2 text-xs  border-t border-slate-200 pt-1 space-y-0'>
              <div className='flex items-center gap-2'>
                <User className='h-3 w-3 text-muted-foreground' />
                <span className=' text-muted-foreground'>Pers. contact:</span>
                {data.supplierContact?.name || '-'}
              </div>
              <div className='flex items-center gap-2'>
                <Mail className='h-3 w-3 text-muted-foreground' />
                <span className='text-muted-foreground'>Email:</span>
                {data.supplierContact?.email || '-'}
              </div>
              <div className='flex items-center gap-2'>
                <Phone className='h-3 w-3 text-muted-foreground' />
                <span className=' text-muted-foreground'>Tel:</span>
                {data.supplierContact?.phone || '-'}
              </div>
            </div>

            {/* Bancă (Listă Multiplă) */}
            <div className='mt-1 pt-2 border-t border-slate-200'>
              <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2'>
                <Landmark className='h-3.5 w-3.5' /> CONTURI BANCARE
              </div>

              {/* Dacă avem lista de conturi, le afișăm pe toate */}
              {data.supplierBankAccounts &&
              data.supplierBankAccounts.length > 0 ? (
                <div className='space-y-1'>
                  {data.supplierBankAccounts.map((acc, idx) => (
                    <div key={idx} className='flex flex-col text-xs'>
                      <div className='font-medium font-mono select-all '>
                        {acc.iban}
                      </div>
                      <div className='text-muted-foreground mt-0.5'>
                        {acc.bank || 'Bancă nespecificată'}
                        {acc.bic && (
                          <span className='text-[10px] '>BIC: {acc.bic}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback pentru cazurile vechi sau fără listă (arata doar principalul)
                <div className='flex flex-col text-xs'>
                  <div className='font-medium font-mono select-all'>
                    {data.supplierIban || '-'}
                  </div>
                  <div className='text-muted-foreground'>
                    {data.supplierBank || '-'}
                  </div>
                </div>
              )}

              {data.paymentId && (
                <div className='text-xs font-semibold text-muted-foreground mt-2 pt-2 border-t border-dashed'>
                  Ref. Plată: {data.paymentId}
                </div>
              )}
            </div>
          </div>

          {/* CLIENT (Beneficiar) */}
          <div className='space-y-1 border rounded-lg p-4'>
            <div className='flex items-center gap-2 font-semibold border-b pb-2'>
              <Building2 className='h-4 w-4' /> CLIENT (BENEFICIAR)
            </div>

            {/* Date Identificare */}
            <div>
              <div className='font-bold text-lg'>
                {data.customerName || '-'}
              </div>
              <div className='flex items-center gap-2 mt-1'>
                <span className='text-sm text-muted-foreground w-8'>CUI:</span>
                <span className='font-bold'>{data.customerCui || '-'}</span>
              </div>
              {data.customerRegCom &&
                data.customerRegCom !== data.customerCui && (
                  <div className='flex items-center gap-2 text-sm mt-0.5'>
                    <span className='text-sm text-muted-foreground w-8'>
                      Reg:
                    </span>
                    <span className='font-mono'>{data.customerRegCom}</span>
                  </div>
                )}
            </div>

            {/* Contact */}
            <div className='mt-2 text-xs  border-t border-slate-100 pt-2 space-y-1'>
              <div className='flex items-center gap-2'>
                <User className='h-3 w-3 text-muted-foreground' />
                <span className='w-10 text-muted-foreground'>Pers:</span>
                {data.customerContact?.name || '-'}
              </div>
              <div className='flex items-center gap-2'>
                <Mail className='h-3 w-3 text-muted-foreground' />
                <span className='w-10 text-muted-foreground'>Email:</span>
                {data.customerContact?.email || '-'}
              </div>
              <div className='flex items-center gap-2'>
                <Phone className='h-3 w-3 text-muted-foreground' />
                <span className='w-10 text-muted-foreground'>Tel:</span>
                {data.customerContact?.phone || '-'}
              </div>
            </div>
          </div>

          {/* DETALII DOCUMENT & REFERINȚE */}
          <div className='space-y-2 border rounded-lg p-4'>
            <div className='flex items-center gap-2 font-semibold border-b pb-2'>
              <Info className='h-4 w-4' /> DETALII DOCUMENT
            </div>

            <div className='grid grid-cols-2 gap-y-1 text-sm'>
              <div className='text-muted-foreground'>Serie:</div>
              <div className='font-bold '>{data.invoiceSeries || '-'}</div>
              <div className='text-muted-foreground'>Număr:</div>
              <div className='font-bold'>{data.invoiceNumber || '-'}</div>
              <div className='text-muted-foreground flex items-center gap-1'>
                <Calendar className='h-3 w-3' /> Data Emiterii:
              </div>
              <div className='font-medium '>
                {data.invoiceDate
                  ? new Date(data.invoiceDate).toLocaleDateString('ro-RO')
                  : '-'}
              </div>
              <div className='text-muted-foreground flex items-center gap-1'>
                <Calendar className='h-3 w-3' /> Scadența:
              </div>
              <div className='font-bold  text-red-600'>
                {data.dueDate
                  ? new Date(data.dueDate).toLocaleDateString('ro-RO')
                  : '-'}
              </div>
              {/* Data Exigibilității TVA (Dacă există) --- */}
              {data.taxPointDate && (
                <>
                  <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                    <Info className='h-3 w-3' /> Exigibilitate TVA:
                  </div>
                  <div className='font-medium text-xs'>
                    {new Date(data.taxPointDate).toLocaleDateString('ro-RO')}
                  </div>
                </>
              )}
              {data.invoicePeriod && (
                <>
                  <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                    <Calendar className='h-3 w-3' /> Perioada:
                  </div>
                  <div className='font-medium text-xs'>
                    {new Date(data.invoicePeriod.startDate).toLocaleDateString(
                      'ro-RO'
                    )}{' '}
                    -{' '}
                    {new Date(data.invoicePeriod.endDate).toLocaleDateString(
                      'ro-RO'
                    )}
                  </div>
                </>
              )}
              {data.billingReference && (
                <>
                  <div className='flex items-center gap-1 text-xs'>
                    <ArrowLeftRight className='h-3 w-3' /> Ref. Factură:
                  </div>
                  <div className='font-medium text-xs text-orange-600'>
                    {data.billingReference.oldInvoiceNumber}
                    {data.billingReference.oldInvoiceDate &&
                      ` din ${new Date(data.billingReference.oldInvoiceDate).toLocaleDateString('ro-RO')}`}
                  </div>
                </>
              )}
            </div>

            {/* Referințe (Afișate necondiționat) */}
            <div className='pt-2 border-t border-slate-100 space-y-1'>
              <div className='flex items-center gap-2 text-xs'>
                <FileSignature className='h-3.5 w-3.5 text-slate-500' />
                <span className='text-muted-foreground w-45'>
                  Referinta Contract:
                </span>
                <span className='font-medium'>
                  {data.contractReference || '-'}
                </span>
              </div>

              <div className='flex items-center gap-2 text-xs'>
                <ShoppingCart className='h-3.5 w-3.5 text-slate-500' />
                <span className='text-muted-foreground w-45'>
                  Comandă Client:
                </span>
                <span className=' font-medium'>
                  {data.orderReference || '-'}
                </span>
              </div>

              <div className='flex items-center gap-2 text-xs'>
                <ShoppingCart className='h-3.5 w-3.5 text-slate-500' />
                <span className='text-muted-foreground w-45'>
                  Comandă Vanzare:
                </span>
                <span className=' font-medium'>{data.salesOrderID || '-'}</span>
              </div>

              <div className='flex items-center gap-2 text-xs'>
                <Truck className='h-3.5 w-3.5 text-slate-500' />
                <span className='text-muted-foreground w-45'>
                  Aviz (Despatch):
                </span>
                <span className=' font-medium'>
                  {data.despatchReference || '-'}
                </span>
              </div>

              <div className='flex items-center gap-2 text-xs'>
                <MapPin className='h-3.5 w-3.5 text-slate-500' />
                <span className='text-muted-foreground w-45'>ID Locație:</span>
                <span className=' font-medium'>
                  {data.deliveryLocationId || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- TABEL PRODUSE --- */}
        <div className='border rounded-md shadow-sm'>
          <Table>
            <TableHeader className='bg-secondary'>
              <TableRow>
                <TableHead className='font-bold'>#</TableHead>
                <TableHead className='font-bold max-w-[550px]'>
                  Produs / Serviciu
                </TableHead>
                <TableHead className='font-bold'>Cod Prod. Furnizor</TableHead>
                <TableHead className='font-bold'>Cant.</TableHead>
                <TableHead className='font-bold'>UM</TableHead>
                <TableHead className='font-bold'>Preț Unitar</TableHead>
                <TableHead className='font-bold'>TVA %</TableHead>
                <TableHead className='font-bold'>Valoare (fără TVA)</TableHead>
                <TableHead className='font-bold'>Valoare TVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line, idx) => (
                <TableRow key={idx} className='hover:bg-secondary/90'>
                  <TableCell className='text-xs'>{idx + 1}</TableCell>
                  <TableCell className='font-medium max-w-[550px] truncate'>
                    {line.productName}
                    <div className='text-[10px] text-muted-foreground'>
                      {line.productDescription || '-'}
                    </div>
                    <div className='text-[10px] text-muted-foreground'>
                      CPV: {line.commodityCode || '-'}
                    </div>
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {line.productCode || '-'}
                  </TableCell>
                  <TableCell className='font-medium'>{line.quantity}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-1'>
                      {line.unitOfMeasure}{' '}
                      <Badge
                        variant='secondary'
                        className='font-normal text-[10px]'
                      >
                        ({line.unitCode})
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span>{formatCurrency(line.price)}</span>
                      {line.baseQuantity > 1 && (
                        <span className='text-[10px] text-muted-foreground'>
                          per {line.baseQuantity} {line.unitOfMeasure}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{line.vatRate}%</TableCell>
                  <TableCell className='font-bold'>
                    {formatCurrency(line.lineValue)}
                    {line.lineAllowanceAmount > 0 && (
                      <div className='text-[10px]  font-normal'>
                        (Discount inclus:{' '}
                        {formatCurrency(line.lineAllowanceAmount)})
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(line.vatAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* --- FOOTER: TOTALURI & NOTE --- */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mt-1'>
          {/* Stânga: Note & Termeni */}
          <div className='space-y-2'>
            <div className='bg-muted-50 border border-red-500 rounded-lg p-2'>
              <h4 className='font-semibold  mb-1 text-sm flex items-center gap-2'>
                <Info className='h-4 w-4' /> Note / Mențiuni
              </h4>
              {data.notes.length > 0 ? (
                <ul className='list-disc list-inside text-sm space-y-1'>
                  {data.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              ) : (
                <span className='text-sm'>
                  - Nu există mențiuni pe factură -
                </span>
              )}
            </div>

            <div className='bg-muted-50 border border-red-500 rounded-lg p-2'>
              <h4 className='font-semibold  mb-1 text-sm flex items-center gap-2'>
                <Info className='h-4 w-4' /> Mentiuni Termeni de Plată
              </h4>
              <p className='text-sm'>
                {data.paymentTermsNote || '  - Nu există mențiuni pe factură -'}
              </p>
            </div>
          </div>

          {/* Dreapta: Totaluri Complexe */}
          <div className='flex flex-col items-end justify-start space-y-1 pr-4 pt-2 min-w-[300px]'>
            {/*  Defalcare TVA (Daca exista) */}
            {data.taxSubtotals && data.taxSubtotals.length > 0 && (
              <div className='w-full text-xs border-b border-slate-100 pb-2 mb-2'>
                <div className='font-semibold text-muted-foreground mb-1 text-right'>
                  Defalcare TVA:
                </div>
                {data.taxSubtotals.map((sub, idx) => (
                  <div key={idx} className='flex justify-between gap-4 text-sm'>
                    <span>
                      Cota TVA: {sub.percent}% ({sub.categoryCode})
                    </span>
                    <div className='flex gap-2'>
                      <span>
                        <span className='text-muted-foreground'>Bază:</span>{' '}
                        {formatCurrency(sub.taxableAmount)}
                      </span>

                      <span>
                        <span className='text-muted-foreground'>TVA:</span>{' '}
                        {formatCurrency(sub.taxAmount)}
                      </span>
                    </div>

                    <span className='text-primary font-bold'>
                      Total: {formatCurrency(data.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Discount Global & Taxe Globale */}
            {data.totalAllowance > 0 && (
              <div className='flex items-center gap-4 text-sm text-green-600'>
                <span>Discount Global:</span>
                <span className='font-bold'>
                  -{formatCurrency(data.totalAllowance)}
                </span>
              </div>
            )}
            {data.totalCharges > 0 && (
              <div className='flex items-center gap-4 text-sm text-red-600'>
                <span>Taxe Suplimentare:</span>
                <span className='font-bold'>
                  +{formatCurrency(data.totalCharges)}
                </span>
              </div>
            )}

            {/* Avansuri (Daca exista) */}
            {data.prepaidAmount > 0 && (
              <div className='flex items-center gap-2 text-sm border-b'>
                <span>Avans Achitat:</span>
                <span className='font-bold'>
                  -{formatCurrency(data.prepaidAmount)}
                </span>
                {data.paymentMethodCode && (
                  <div className='flex justify-between items-center w-full text-sm mb-1'>
                    <span className='text-muted-foreground'>Metodă Plată:</span>
                    <span className='font-medium'>
                      {getPaymentMethodName(data.paymentMethodCode)}
                    </span>
                  </div>
                )}

                {/* Curs Valutar (Dacă există și e diferit de 0 sau 1) */}
                {data.exchangeRate && data.exchangeRate > 1 && (
                  <div className='flex justify-between items-center w-full text-sm mb-1'>
                    <span className='text-muted-foreground'>Curs Valutar:</span>
                    <span className='font-medium'>{data.exchangeRate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Total General */}
            <div className='text-3xl font-black flex flex-col items-end'>
              <span className='text-2xl font-normal text-primary'>
                De Plată: {formatCurrency(data.payableAmount)}{' '}
              </span>

              {/* Folosim payableAmount nu totalAmount */}
              <span className='text-sm font-medium'>
                Moneda: {data.currency}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
