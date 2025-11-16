'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  ClientDeliveryNoteItem,
  getDeliveryNotesForClient,
} from '@/lib/db/modules/financial/delivery-notes/client-delivery-note.actions'
import { DeliveryNoteStatusBadge } from '@/app/(root)/financial/delivery-notes/components/DeliveryNoteStatusBadge'

interface ClientDeliveryNotesListProps {
  clientId: string
}

export function ClientDeliveryNotesList({
  clientId,
}: ClientDeliveryNotesListProps) {
  const router = useRouter()
  const [deliveryNotes, setDeliveryNotes] = useState<ClientDeliveryNoteItem[]>(
    []
  )
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchDeliveryNotes = () => {
      startTransition(async () => {
        try {
          const result = await getDeliveryNotesForClient(clientId, page)
          setDeliveryNotes(result.data || [])
          setTotalPages(result.totalPages || 0)
        } catch (error) {
          console.error('Failed to fetch client delivery notes:', error)
          setDeliveryNotes([])
          setTotalPages(0)
        }
      })
    }
    fetchDeliveryNotes()
  }, [clientId, page])

  const handleRowClick = (deliveryNoteId: string) => {
    router.push(`/delivery-notes/${deliveryNoteId}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nr. Aviz</TableHead>
              <TableHead>Data Creării</TableHead>
              <TableHead>Nr. Comandă</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : deliveryNotes.length > 0 ? (
              deliveryNotes.map((note) => (
                <TableRow
                  key={note._id.toString()}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleRowClick(note._id.toString())}
                >
                  <TableCell className='font-medium'>
                    {note.seriesName}-{note.noteNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(note.createdAt).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>{note.orderNumberSnapshot}</TableCell>
                  <TableCell>
                    <DeliveryNoteStatusBadge status={note.status} />
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(note.totals.grandTotal)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Niciun aviz găsit pentru acest client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
