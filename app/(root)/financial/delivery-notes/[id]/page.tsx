import { getDeliveryNoteById } from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DeliveryNoteDetailsActions } from '../components/details/DeliveryNoteDetailsActions'
import { DeliveryNoteDetails } from '../components/details/DeliveryNoteDetails'

interface DeliveryNoteDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DeliveryNoteDetailsPage({
  params: paramsPromise,
}: DeliveryNoteDetailsPageProps) {
  const params = await paramsPromise
  const noteResult = await getDeliveryNoteById(params.id)

  if (!noteResult.success || !noteResult.data) {
    console.error(noteResult.message)
    return redirect('/financial/delivery-notes')
  }

  const note = noteResult.data

  // 2. Auth Session (pt User ID la acțiuni)
  const session = await auth()
  const userId = session?.user?.id || ''
  const userName = session?.user?.name || 'Unknown'

  return (
    <div className='flex flex-col gap-0'>
      {/* Actions Header */}
      <DeliveryNoteDetailsActions
        note={note}
        currentUserId={userId}
        currentUserName={userName}
      />

      {/* Main Details Layout */}
      <DeliveryNoteDetails note={note} />
    </div>
  )
}
