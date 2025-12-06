import React from 'react'
import { auth } from '@/auth'
import { getDeliveryNotes } from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import { DeliveryNotesList } from './components/DeliveryNotesList'

export default async function DeliveryNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const page = Number(resolvedSearchParams.page) || 1
  // Preluăm sesiunea pentru a ști cine face acțiunile
  const session = await auth()
  const userId = session?.user?.id || ''
  const userName = session?.user?.name || 'Unknown User'

  // Preluăm datele inițiale pe server (Server Side Rendering)
  // Asta asigură că tabelul nu e gol când intră prima dată pe pagină (SEO & UX)
  const initialData = await getDeliveryNotes(page)

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Avize de Însoțire a Mărfii
        </h1>
      </div>

      <DeliveryNotesList
        initialData={initialData}
        currentPage={page}
        currentUserId={userId}
        currentUserName={userName}
      />
    </div>
  )
}
