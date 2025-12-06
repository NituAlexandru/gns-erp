import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  Calendar,
  Clock,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Truck,
  User,
  User2,
} from 'lucide-react'
import { DetailRow } from './DeliveryNoteDetails.helpers'

interface DeliveryNoteInfoCardsProps {
  note: DeliveryNoteDTO
}

export function DeliveryNoteInfoCards({ note }: DeliveryNoteInfoCardsProps) {
  const deliveryAddr = note.deliveryAddress
  const addressString = `Str. ${deliveryAddr.strada}, nr. ${deliveryAddr.numar}, ${deliveryAddr.localitate}, Jud. ${deliveryAddr.judet}, ${deliveryAddr.tara || 'RO'}`

  const timeSlots =
    note.deliverySlots && note.deliverySlots.length > 0
      ? note.deliverySlots.join(', ')
      : '-'

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-2'>
        {/* FURNIZOR */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader className='pt-4 bg-muted/20'>
            <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
              <Building2 className='h-4 w-4' /> FURNIZOR (EXPEDITOR)
            </CardTitle>
          </CardHeader>
          <CardContent className='py-0 space-y-1 mt-2'>
            <div className='font-bold text-base'>
              {note.companySnapshot.name}
            </div>
            <div>
              <DetailRow label='CIF:' value={note.companySnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={note.companySnapshot.regCom}
              />
            </div>
            <DetailRow
              icon={MapPin}
              label='Sediu:'
              value={`Str. ${note.companySnapshot.address.strada}, nr. ${note.companySnapshot.address.numar || '-'}, ${note.companySnapshot.address.localitate}, Jud. ${note.companySnapshot.address.judet}`}
            />
            <DetailRow
              icon={Phone}
              label='Telefon:'
              value={note.companySnapshot.phone}
            />
            <DetailRow
              icon={Mail}
              label='Email:'
              value={note.companySnapshot.email}
            />
            <Separator className='my-2' />
            <DetailRow
              icon={Landmark}
              label='Banca:'
              value={`${note.companySnapshot.bank} (${note.companySnapshot.currency})`}
            />
            <DetailRow
              label='IBAN:'
              value={
                <span className='font-mono text-xs sm:text-sm'>
                  {note.companySnapshot.iban}
                </span>
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
          <CardContent className='py-0 space-y-1 mt-2'>
            <div className='font-bold text-base'>
              {note.clientSnapshot.name}
            </div>
            <div>
              <DetailRow label='CIF:' value={note.clientSnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={note.clientSnapshot.regCom}
              />
            </div>
            <DetailRow
              icon={MapPin}
              label='Sediu:'
              value={`Str. ${note.clientSnapshot.address}, Jud. ${note.clientSnapshot.judet}`}
            />
            <DetailRow
              icon={User}
              label='Pers. Contact:'
              value={note.deliveryAddress.persoanaContact || '-'}
            />
            <DetailRow
              icon={Phone}
              label='Telefon:'
              value={note.deliveryAddress.telefonContact || '-'}
            />
            <Separator className='my-2' />
            <DetailRow
              icon={Landmark}
              label='Banca:'
              value={note.clientSnapshot.bank}
            />
            <DetailRow
              label='IBAN:'
              value={
                <span className='font-mono text-xs sm:text-sm'>
                  {note.clientSnapshot.iban}
                </span>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* DATE PRIVIND EXPEDIȚIA */}
      <Card className='py-0 gap-0 pb-4'>
        <CardHeader className='pt-4 bg-muted/20'>
          <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
            <Truck className='h-4 w-4' /> DATE PRIVIND EXPEDIȚIA
          </CardTitle>
        </CardHeader>
        <CardContent className='py-0 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <DetailRow
              icon={User2}
              label='Nume Delegat / Șofer:'
              value={note.driverName || '-'}
            />
            <DetailRow
              icon={Truck}
              label='Mijloc Transport:'
              value={
                <div className='flex flex-col'>
                  <span>{note.vehicleNumber || '-'}</span>
                  {note.vehicleType && (
                    <span className='text-xs text-muted-foreground'>
                      {note.vehicleType}
                    </span>
                  )}
                </div>
              }
            />
            <DetailRow
              icon={Truck}
              label='Remorcă:'
              value={note.trailerNumber || '-'}
            />
            {note.deliverySlots && note.deliverySlots.length > 0 && (
              <DetailRow
                icon={Clock}
                label='Interval Orar:'
                value={timeSlots}
              />
            )}
          </div>

          <div className='space-y-1'>
            <DetailRow
              icon={Calendar}
              label='Data Emiterii Aviz:'
              value={new Date(note.createdAt).toLocaleDateString('ro-RO')}
            />
            {note.deliveryDate && (
              <DetailRow
                icon={Calendar}
                label='Data Livrare:'
                value={
                  <span className='font-semibold'>
                    {new Date(note.deliveryDate).toLocaleDateString('ro-RO')}
                  </span>
                }
              />
            )}

            <Separator className='my-1 border-dashed' />

            <DetailRow
              icon={MapPin}
              label='Adresa Livrare:'
              value={addressString}
            />
            <DetailRow
              icon={User}
              label='Pers. Contact (Recepție):'
              value={
                <span className='font-medium'>
                  {note.deliveryAddress.persoanaContact || '-'}
                </span>
              }
            />
            <DetailRow
              icon={Phone}
              label='Telefon Contact:'
              value={note.deliveryAddress.telefonContact}
            />

            {note.lastUpdatedByName && (
              <div className='mt-2 text-xs text-muted-foreground text-right italic'>
                Operat de: {note.lastUpdatedByName}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
