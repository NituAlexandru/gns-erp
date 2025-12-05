import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
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

interface InvoiceInfoCardsProps {
  invoice: PopulatedInvoice
}

export function InvoiceInfoCards({ invoice }: InvoiceInfoCardsProps) {
  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-2'>
        {/* FURNIZOR */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader className='pt-4 bg-muted/20'>
            <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
              <Building2 className='h-4 w-4' /> FURNIZOR
            </CardTitle>
          </CardHeader>
          <CardContent className='py-0 space-y-1'>
            <div className='font-bold text-base'>
              {invoice.companySnapshot.name}
            </div>
            <div>
              <DetailRow label='CIF:' value={invoice.companySnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={invoice.companySnapshot.regCom}
              />
            </div>
            <DetailRow
              icon={MapPin}
              label='Sediu:'
              value={` Str. ${invoice.companySnapshot.address.strada}, nr. ${invoice.companySnapshot.address.numar}, ${invoice.companySnapshot.address.localitate}, Jud. ${invoice.companySnapshot.address.judet}, ${invoice.companySnapshot.address.tara}`}
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

            <Separator />
            <DetailRow
              icon={Landmark}
              label='Cont Bancar:'
              value={
                <div>
                  <div className='font-mono select-all'>
                    {invoice.companySnapshot.iban}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {invoice.companySnapshot.bank} <span> - </span>
                    {invoice.companySnapshot.currency}
                  </div>
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* CLIENT */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader className='pt-4 bg-muted/20'>
            <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
              <User className='h-4 w-4' /> CLIENT (BENEFICIAR)
            </CardTitle>
          </CardHeader>
          <CardContent className='py-0 space-y-1'>
            <div className='font-bold text-base'>
              {invoice.clientSnapshot.name}
            </div>
            <div>
              <DetailRow label='CIF:' value={invoice.clientSnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={invoice.clientSnapshot.regCom}
              />
            </div>
            <DetailRow
              icon={MapPin}
              label='Sediu:'
              value={` Str. ${invoice.clientSnapshot.address.strada}, nr. ${invoice.clientSnapshot.address.numar}, ${invoice.clientSnapshot.address.localitate}, Jud. ${invoice.clientSnapshot.address.judet}, ${invoice.clientSnapshot.address.tara}`}
            />
            <DetailRow
              icon={User2}
              label='Pers. Contact:'
              value={`${invoice.deliveryAddress.persoanaContact}`}
            />
            <DetailRow
              icon={Phone}
              label='Nr. Telefon:'
              value={`${invoice.deliveryAddress.telefonContact}`}
            />
            <Separator />
            <DetailRow
              icon={Landmark}
              label='Cont Bancar:'
              value={
                <div>
                  <div className='font-mono select-all'>
                    {invoice.clientSnapshot.iban}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {invoice.clientSnapshot.bank}
                  </div>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-2'>
        {/* DETALII DOCUMENT & REFERINȚE */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader className='pt-4 bg-muted/20'>
            <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
              <FileText className='h-4 w-4' /> DETALII & REFERINȚE
            </CardTitle>
          </CardHeader>
          <CardContent className='py-0 space-y-1 mt-2'>
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
                  'ro-RO'
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
              value={invoice.logisticSnapshots?.deliveryNoteNumbers?.join(', ')}
            />
            <DetailRow
              icon={User}
              label='Intocmit de:'
              value={invoice.salesAgentSnapshot?.name || invoice.createdByName}
            />
          </CardContent>
        </Card>
        {/* DATE PRIVIND EXPEDIȚIA */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader className='pt-4 bg-muted/20'>
            <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
              <Truck className='h-4 w-4' /> DATE PRIVIND EXPEDIȚIA
            </CardTitle>
          </CardHeader>
          <CardContent className='py-0 space-y-1 mt-2'>
            <DetailRow
              icon={User}
              label='Numele Delegatului:'
              value={
                invoice.driverName ||
                invoice.deliveryAddress?.persoanaContact ||
                '-'
              }
            />
            <DetailRow
              icon={Truck}
              label='Mijloc de Transport:'
              value={
                invoice.vehicleNumber ? (
                  <span>{invoice.vehicleNumber}</span>
                ) : (
                  '-'
                )
              }
            />
            <DetailRow
              icon={Truck}
              label='Remorca:'
              value={invoice.trailerNumber || '-'}
            />
            <DetailRow
              icon={Calendar}
              label='Data Expediției:'
              value={new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
            />
            <DetailRow
              icon={User}
              label='Adresa livrare:'
              value={`Str. ${invoice.deliveryAddress.strada}, nr. ${invoice.deliveryAddress.numar || '-'}, ${invoice.deliveryAddress.localitate}, Jud. ${invoice.deliveryAddress.judet}, ${invoice.deliveryAddress.tara}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
