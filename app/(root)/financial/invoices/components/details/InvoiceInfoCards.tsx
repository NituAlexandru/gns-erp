import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  Truck,
  User,
  User2,
} from 'lucide-react'
import { DetailRow } from './InvoiceDetails.helpers'
import { cn } from '@/lib/utils'

interface InvoiceInfoCardsProps {
  invoice: PopulatedInvoice
  isPreview?: boolean
}

export function InvoiceInfoCards({
  invoice,
  isPreview = false,
}: InvoiceInfoCardsProps) {
  const formatAddress = (addr: any) => {
    if (!addr) return '-'
    return [
      addr.strada ? `Str. ${addr.strada}` : null,
      addr.numar ? `nr. ${addr.numar}` : null,
      addr.alteDetalii,
      addr.localitate,
      addr.judet ? `Jud. ${addr.judet}` : null,
      addr.tara || 'RO',
    ]
      .filter(Boolean)
      .join(', ')
  }

  const companyAddressString = formatAddress(invoice.companySnapshot.address)
  const clientAddressString = formatAddress(invoice.clientSnapshot.address)
  const deliveryAddressString = formatAddress(invoice.deliveryAddress)
  const isCancelled = invoice.status === 'CANCELLED'

  // --- STILURI DINAMICE (MODIFICAT DOAR AICI VALORILE) ---
  const textSizeClass = isPreview ? 'text-[10px] leading-3' : 'text-sm' // Am adaugat leading-3 pentru spatiere mai mica intre randuri
  // Modificat padding header: mai mic in preview si fara bg-muted implicit daca vrei sa fie clean, sau bg-muted/30
  const headerPadding = isPreview ? 'p-1.5 bg-muted/30' : 'pt-4 bg-muted/20'
  // Modificat padding content: spatiu mult mai mic intre elemente (space-y-0.5)
  const contentPadding = isPreview ? 'p-2 pt-1 space-y-0.5' : 'py-0 space-y-1'
  const iconSize = isPreview ? 'h-3 w-3' : 'h-4 w-4'
  const titleSize = isPreview ? 'text-[11px]' : 'text-sm'
  const gapClass = isPreview ? 'gap-1 mb-1' : 'gap-2 mb-2'

  // Variabila noua ajutatoare pentru titlul firmelor (ca sa nu fie text-base in preview)
  const nameTextSize = isPreview ? 'text-xs' : 'text-base'

  return (
    <div className={cn('space-y-2', isPreview && 'space-y-1')}>
      <div className={cn('grid grid-cols-1 md:grid-cols-2', gapClass)}>
        {/* FURNIZOR */}
        <Card className={cn('py-0 gap-0', isPreview ? 'pb-1' : 'pb-4')}>
          <CardHeader className={cn(headerPadding)}>
            <CardTitle
              className={cn(
                'font-bold flex items-center gap-2 text-muted-foreground',
                titleSize,
              )}
            >
              <Building2 className={iconSize} /> FURNIZOR
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(contentPadding)}>
            <div
              className={cn(
                'font-bold',
                nameTextSize, // Folosim variabila ajustata
              )}
            >
              {invoice.companySnapshot.name}
            </div>
            <div className={textSizeClass}>
              <DetailRow label='CIF:' value={invoice.companySnapshot.cui} />
              <DetailRow
                label='Reg. Com.:'
                value={invoice.companySnapshot.regCom}
              />
            </div>
            <div className={textSizeClass}>
              <DetailRow
                icon={MapPin}
                label='Sediu:'
                value={companyAddressString}
              />
              <DetailRow
                icon={Phone}
                label='Nr. Telefon:'
                value={`${invoice.companySnapshot.phone}`}
              />
              <DetailRow
                icon={Mail}
                label='e-mail:'
                value={`${invoice.companySnapshot.email}`}
              />
              <Separator className={isPreview ? 'my-0.5' : 'my-1'} />
              <DetailRow
                icon={Landmark}
                label='Cont Bancar:'
                value={
                  <div>
                    <div className='font-mono select-all'>
                      {invoice.companySnapshot.iban}
                    </div>
                    <div
                      className={cn(
                        'text-muted-foreground opacity-80',
                        isPreview ? 'text-[9px]' : 'text-xs',
                      )}
                    >
                      {invoice.companySnapshot.bank} -{' '}
                      {invoice.companySnapshot.currency}
                    </div>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* CLIENT */}
        <Card className={cn('py-0 gap-0', isPreview ? 'pb-1' : 'pb-4')}>
          <CardHeader className={cn(headerPadding)}>
            <CardTitle
              className={cn(
                'font-bold flex items-center gap-2 text-muted-foreground',
                titleSize,
              )}
            >
              <User className={iconSize} /> CLIENT (BENEFICIAR)
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(contentPadding)}>
            <div className={cn('font-bold', nameTextSize)}>
              {invoice.clientSnapshot.name}
            </div>
            <div className={textSizeClass}>
              <DetailRow label='CIF:' value={invoice.clientSnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={invoice.clientSnapshot.regCom}
              />
            </div>
            <div className={textSizeClass}>
              <DetailRow
                icon={MapPin}
                label='Sediu:'
                value={clientAddressString}
              />
              <DetailRow
                icon={User2}
                label='Pers. Contact:'
                value={invoice.deliveryAddress.persoanaContact || '-'}
              />
              <DetailRow
                icon={Phone}
                label='Nr. Telefon:'
                value={invoice.deliveryAddress.telefonContact || '-'}
              />
              <Separator className={isPreview ? 'my-0.5' : 'my-1'} />
              <DetailRow
                icon={Landmark}
                label='Cont Bancar:'
                value={
                  <div>
                    <div className='font-mono select-all'>
                      {invoice.clientSnapshot.iban}
                    </div>
                    <div
                      className={cn(
                        'text-muted-foreground opacity-80',
                        isPreview ? 'text-[9px]' : 'text-xs',
                      )}
                    >
                      {invoice.clientSnapshot.bank}
                    </div>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={cn('grid grid-cols-1 md:grid-cols-2', gapClass)}>
        {/* DETALII DOCUMENT & REFERINȚE */}
        <Card className={cn('py-0 gap-0', isPreview ? 'pb-1' : 'pb-4')}>
          <CardHeader className={cn(headerPadding)}>
            <CardTitle
              className={cn(
                'font-bold flex items-center gap-2 text-muted-foreground',
                titleSize,
              )}
            >
              <FileText className={iconSize} /> DETALII & REFERINȚE
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(contentPadding)}>
            <div
              className={cn(
                'grid grid-cols-1',
                isPreview ? 'gap-0.5' : 'gap-1',
                textSizeClass,
              )}
            >
              <div className='flex justify-between'>
                <DetailRow
                  icon={FileText}
                  label='Nr. Factură:'
                  value={invoice.invoiceNumber}
                />
                <DetailRow
                  icon={Calendar}
                  label='Data:'
                  value={new Date(invoice.invoiceDate).toLocaleDateString(
                    'ro-RO',
                  )}
                />
              </div>
              <div className='flex justify-between'>
                <DetailRow
                  icon={FileText}
                  label='Factură:'
                  value={invoice.invoiceType}
                />
                <DetailRow
                  icon={Calendar}
                  label='Scadență:'
                  value={
                    <span className='text-red-600 font-semibold'>
                      {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
                    </span>
                  }
                />
              </div>
              <Separator
                className={
                  isPreview ? 'my-0.5 border-dashed' : 'my-1 border-dashed'
                }
              />
              <DetailRow
                icon={ShoppingCart}
                label='Comanda nr.:'
                value={invoice.logisticSnapshots?.orderNumbers?.join(', ')}
              />
              <DetailRow
                icon={Truck}
                label='Livrare nr.:'
                value={invoice.logisticSnapshots?.deliveryNumbers?.join(', ')}
              />
              <DetailRow
                icon={Truck}
                label='Aviz nr.:'
                value={invoice.logisticSnapshots?.deliveryNoteNumbers?.join(
                  ', ',
                )}
              />
              <DetailRow
                icon={User}
                label='Agent:'
                value={
                  invoice.salesAgentSnapshot?.name || invoice.createdByName
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* DATE PRIVIND EXPEDIȚIA */}
        <Card className={cn('py-0 gap-0', isPreview ? 'pb-1' : 'pb-4')}>
          <CardHeader className={cn(headerPadding)}>
            <CardTitle
              className={cn(
                'font-bold flex items-center gap-2 text-muted-foreground',
                titleSize,
              )}
            >
              <Truck className={iconSize} /> DATE PRIVIND EXPEDIȚIA
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(contentPadding)}>
            <div className={textSizeClass}>
              <DetailRow
                icon={User}
                label='Delegat:'
                value={
                  invoice.driverName ||
                  invoice.deliveryAddress?.persoanaContact ||
                  '-'
                }
              />
              <DetailRow
                icon={Truck}
                label='Auto:'
                value={
                  invoice.vehicleNumber ? (
                    <span>{invoice.vehicleNumber}</span>
                  ) : (
                    '-'
                  )
                }
              />
              {invoice.trailerNumber && (
                <DetailRow
                  icon={Truck}
                  label='Remorca:'
                  value={invoice.trailerNumber}
                />
              )}
              <DetailRow
                icon={FileText}
                label='Cod UIT:'
                value={
                  <span className='font-mono font-bold text-primary'>
                    {invoice.uitCode || '-'}
                  </span>
                }
              />
              <DetailRow
                icon={Calendar}
                label='Data Expediției:'
                value={new Date(invoice.invoiceDate).toLocaleDateString(
                  'ro-RO',
                )}
              />
              <DetailRow
                icon={User}
                label='Adresa livrare:'
                value={deliveryAddressString}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {isCancelled && (
        <div
          className={cn(
            'rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 mb-2',
            isPreview ? 'p-2' : 'p-3',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 border-b border-red-200/50',
              isPreview ? 'mb-1 pb-1' : 'mb-2 pb-2',
            )}
          >
            <AlertCircle
              className={cn('text-red-600 dark:text-red-400', iconSize)}
            />
            <span
              className={cn(
                'font-bold text-red-700 dark:text-red-400 uppercase tracking-wide',
                isPreview ? 'text-[10px]' : 'text-xs',
              )}
            >
              Această factură este anulată
            </span>
          </div>
          <div className='space-y-1'>
            <p
              className={cn(
                'text-red-600/80 dark:text-red-300 uppercase font-semibold',
                isPreview ? 'text-[8px]' : 'text-xs',
              )}
            >
              Motiv:
            </p>
            <p
              className={cn(
                'font-bold text-red-900 dark:text-red-100',
                isPreview ? 'text-[10px]' : 'text-sm',
              )}
            >
              {invoice.cancellationReason ||
                invoice.rejectionReason ||
                'Nespecificat'}
            </p>
            {invoice.cancelledByName && (
              <div
                className={cn(
                  'mt-1 text-red-700/70 dark:text-red-300/70 italic text-right',
                  isPreview ? 'text-[9px]' : 'text-xs',
                )}
              >
                Anulată de {invoice.cancelledByName} <br />
                la data{' '}
                {invoice.cancelledAt
                  ? new Date(invoice.cancelledAt).toLocaleString('ro-RO')
                  : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
