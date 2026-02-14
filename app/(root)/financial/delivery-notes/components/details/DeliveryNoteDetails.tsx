import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { DeliveryNoteInfoCards } from './DeliveryNoteInfoCards'
import { DeliveryNoteSummary } from './DeliveryNoteSummary'
import { DeliveryNoteItemsTable } from './DeliveryNoteItemsTable'

interface DeliveryNoteDetailsProps {
  note: DeliveryNoteDTO
  isAdmin?: boolean
}

export function DeliveryNoteDetails({
  note,
  isAdmin = false,
}: DeliveryNoteDetailsProps) {
  return (
    <div className='grid grid-cols-1 2xl:grid-cols-3 gap-2 p-0'>
      <div className='xl:col-span-2 space-y-1'>
        <DeliveryNoteInfoCards note={note} />
      </div>

      <div className='2xl:col-span-1'>
        <DeliveryNoteSummary note={note} />
      </div>

      <div className='xl:col-span-3 mt-[-8px]'>
        <DeliveryNoteItemsTable
          items={note.items}
          isAdmin={isAdmin}
          status={note.status}
        />
      </div>
    </div>
  )
}
