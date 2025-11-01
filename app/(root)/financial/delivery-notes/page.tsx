// app/(root)/financial/delivery-notes/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

// TODO: Vom înlocui cu apel real la getDeliveryNotes()
interface DeliveryNote {
  _id: string
  noteNumber: string
  clientName: string
  status: string
  createdAt: string
}

export default function DeliveryNotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<DeliveryNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: fetch real data din API /actions
    setTimeout(() => {
      setNotes([
        {
          _id: '1',
          noteNumber: 'AVZ0001/2025',
          clientName: 'SC Ultimul Client Test SRL',
          status: 'IN_TRANSIT',
          createdAt: '2025-10-18',
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  return (
    <div className='flex flex-col gap-6'>
      {/* Header: Titlu + Butoane */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Avize de Livrare</h1>
        <Button onClick={() => router.push('/financial/delivery-notes/new')}>
          <PlusCircle className='w-4 h-4 mr-2' />
          Creează Aviz
        </Button>
      </div>

      {/* Placeholder listă */}
      <div className='border rounded-lg p-4 bg-card'>
        {loading ? (
          <p className='text-muted-foreground'>Se încarcă avizele...</p>
        ) : notes.length === 0 ? (
          <p className='text-muted-foreground'>Nu există avize încă.</p>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b'>
                <th className='py-2 text-left'>Număr</th>
                <th className='py-2 text-left'>Client</th>
                <th className='py-2 text-left'>Status</th>
                <th className='py-2 text-left'>Data</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr
                  key={note._id}
                  className='hover:bg-muted/40 cursor-pointer'
                  onClick={() =>
                    router.push(`/financial/delivery-notes/${note._id}`)
                  }
                >
                  <td className='py-2'>{note.noteNumber}</td>
                  <td>{note.clientName}</td>
                  <td>{note.status}</td>
                  <td>{note.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
