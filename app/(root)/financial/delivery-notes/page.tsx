import { auth } from '@/auth'
import { getDeliveryNotes } from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import { DeliveryNotesList } from './components/DeliveryNotesList'

interface PageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    clientId?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function DeliveryNotesPage(props: PageProps) {
  const resolvedSearchParams = await props.searchParams
  const page = Number(resolvedSearchParams.page) || 1

  const session = await auth()
  const userId = session?.user?.id || ''
  const userName = session?.user?.name || 'Unknown User'

  const filters = {
    q: resolvedSearchParams.q,
    status: resolvedSearchParams.status as any,
    clientId: resolvedSearchParams.clientId,
    startDate: resolvedSearchParams.startDate,
    endDate: resolvedSearchParams.endDate,
  }

  const result = await getDeliveryNotes(page, filters)

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Avize de Însoțire a Mărfii
        </h1>
      </div>

      <DeliveryNotesList
        data={result.data}
        totalPages={result.totalPages}
        currentPage={page}
        currentUserId={userId}
        currentUserName={userName}
      />
    </div>
  )
}
