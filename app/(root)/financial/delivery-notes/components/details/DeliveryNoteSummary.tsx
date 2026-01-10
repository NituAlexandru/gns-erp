import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Info, ShoppingCart } from 'lucide-react'
import { DetailRow } from './DeliveryNoteDetails.helpers'

interface DeliveryNoteSummaryProps {
  note: DeliveryNoteDTO
}

export function DeliveryNoteSummary({ note }: DeliveryNoteSummaryProps) {
  return (
    <div className='space-y-2'>
      {/* REFERINȚE DOCUMENT */}
      <Card className='bg-muted/30 py-2 gap-2'>
        <CardHeader className='p-0 pl-6 pt-2'>
          <CardTitle className='text-base'>Detalii & Referințe</CardTitle>
        </CardHeader>

        <CardContent className='space-y-3 text-sm mt-2'>
          <DetailRow
            icon={FileText}
            label='Serie & Număr:'
            value={
              <span className='font-bold'>
                {note.seriesName} - {note.noteNumber}
              </span>
            }
          />
          <DetailRow
            icon={Calendar}
            label='Data Emiterii:'
            value={new Date(note.createdAt).toLocaleDateString('ro-RO')}
          />
          <DetailRow
            icon={Calendar}
            label='Intocmit de:'
            value={<span className='font-bold'>{note.createdByName}</span>}
          />
          <hr className='border-dashed' />
          <DetailRow
            icon={ShoppingCart}
            label='Comanda Ref:'
            value={note.orderNumberSnapshot}
          />
          <DetailRow
            icon={FileText}
            label='Livrare Ref:'
            value={note.deliveryNumberSnapshot}
          />
        </CardContent>
      </Card>

      {/* CARD MENTIUNI / NOTE */}
      <Card className='py-2 gap-0 pb-6 h-full'>
        <CardHeader className='py-0'>
          <CardTitle className='text-sm font-semibold flex items-center gap-2'>
            <Info className='h-4 w-4' /> Mențiuni
            <span className='text-muted-foreground'>(Note Aviz)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='mt-2'>
          <div className='text-sm bg-muted/30 p-2 rounded-md border border-dashed min-h-[80px]'>
            {note.deliveryNotesSnapshot ||
              note.orderNotesSnapshot ||
              'Nu există mențiuni.'}
          </div>
          {note.uitCode && (
            <div className='border-t pt-2 mt-1'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-muted-foreground uppercase'>
                  Cod UIT (e-Transport):
                </span>
                <span className='font-mono font-bold text-sm bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded select-all'>
                  {note.uitCode}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
