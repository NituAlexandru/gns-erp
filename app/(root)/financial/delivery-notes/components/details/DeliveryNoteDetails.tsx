import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { DeliveryNoteInfoCards } from './DeliveryNoteInfoCards'
import { DeliveryNoteSummary } from './DeliveryNoteSummary'
import { DeliveryNoteItemsTable } from './DeliveryNoteItemsTable'

interface DeliveryNoteDetailsProps {
  note: DeliveryNoteDTO
}

export function DeliveryNoteDetails({ note }: DeliveryNoteDetailsProps) {
  return (
    <div className='grid grid-cols-1 2xl:grid-cols-3 gap-2 p-0'>
      {/* COLOANA STÂNGA (2/3) - Info Cards */}
      <div className='xl:col-span-2 space-y-1'>
        <DeliveryNoteInfoCards note={note} />
      </div>

      {/* COLOANA DREAPTA (1/3) - Summary & Notes */}
      <div className='2xl:col-span-1'>
        <DeliveryNoteSummary note={note} />
      </div>

      {/* JOS (Full Width) - Table */}
      <div className='xl:col-span-3 mt-[-8px]'>
        <DeliveryNoteItemsTable items={note.items} />
      </div>
    </div>
  )
}
