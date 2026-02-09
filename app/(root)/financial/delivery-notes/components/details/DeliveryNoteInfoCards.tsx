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
import { cn } from '@/lib/utils'

interface DeliveryNoteInfoCardsProps {
  note: DeliveryNoteDTO
  isPreview?: boolean
}

export function DeliveryNoteInfoCards({
  note,
  isPreview = false,
}: DeliveryNoteInfoCardsProps) {
  const deliveryAddr = note.deliveryAddress
  const addressString = [
    deliveryAddr.strada ? `Str. ${deliveryAddr.strada}` : null,
    deliveryAddr.numar ? `nr. ${deliveryAddr.numar}` : null,
    deliveryAddr.alteDetalii,
    deliveryAddr.localitate,
    deliveryAddr.judet ? `Jud. ${deliveryAddr.judet}` : null,
    deliveryAddr.tara || 'RO',
  ]
    .filter(Boolean)
    .join(', ')

  const timeSlots =
    note.deliverySlots && note.deliverySlots.length > 0
      ? note.deliverySlots.join(', ')
      : '-'

  const textSizeClass = isPreview ? 'text-[10px]' : 'text-sm'
  const contentPadding = isPreview ? 'p-1 mt-0' : 'py-0 mt-2'
  const iconSize = isPreview ? 'h-3 w-3' : 'h-4 w-4'
  const titleSize = isPreview ? 'text-sm' : 'text-base'

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-2'>
        {/* FURNIZOR */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader
            className={cn('bg-muted/20', isPreview ? 'pt-2 p-2' : 'pt-4')}
          >
            <CardTitle
              className={cn(
                'font-bold flex items-center gap-2 text-muted-foreground',
                textSizeClass,
              )}
            >
              <Building2 className={iconSize} /> FURNIZOR (EXPEDITOR)
            </CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-1', contentPadding)}>
            <div className={cn('font-bold', titleSize)}>
              {note.companySnapshot.name}
            </div>
            <div className={textSizeClass}>
              <DetailRow label='CIF:' value={note.companySnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={note.companySnapshot.regCom}
              />
            </div>
            <div className={textSizeClass}>
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
            </div>
          </CardContent>
        </Card>

        {/* CLIENT */}
        <Card className='py-0 gap-0 pb-4'>
          <CardHeader
            className={cn('bg-muted/20', isPreview ? 'pt-2 p-2' : 'pt-4')}
          >
            <CardTitle
              className={cn(
                'font-bold flex items-center gap-2 text-muted-foreground',
                textSizeClass,
              )}
            >
              <User className={iconSize} /> CLIENT (BENEFICIAR)
            </CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-1', contentPadding)}>
            <div className={cn('font-bold', titleSize)}>
              {note.clientSnapshot.name}
            </div>
            <div className={textSizeClass}>
              <DetailRow label='CIF:' value={note.clientSnapshot.cui} />
              <DetailRow
                label='Nr. Reg. Com.:'
                value={note.clientSnapshot.regCom}
              />
            </div>
            <div className={textSizeClass}>
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DATE PRIVIND EXPEDIȚIA */}
      <Card className='py-0 gap-0 pb-2'>
        <CardHeader
          className={cn('bg-muted/20', isPreview ? 'pt-1 p-1' : 'pt-4')}
        >
          <CardTitle
            className={cn(
              'font-bold flex items-center gap-1 text-muted-foreground',
              textSizeClass,
            )}
          >
            <Truck className={iconSize} /> DATE PRIVIND EXPEDIȚIA
          </CardTitle>
        </CardHeader>
        <CardContent
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 gap-2',
            contentPadding,
            textSizeClass,
          )}
        >
          <div className={cn('space-y-0', textSizeClass)}>
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
                    <span className='text-[10px] text-muted-foreground'>
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

          <div className={cn('space-y-0', textSizeClass)}>
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
