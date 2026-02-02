'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
import { ClientDeliveryNoteItem } from '@/lib/db/modules/financial/delivery-notes/client-delivery-note.actions'
import { DeliveryNoteStatusBadge } from '@/app/(root)/financial/delivery-notes/components/DeliveryNoteStatusBadge'

interface ClientDeliveryNotesListProps {
  clientId: string
  initialData: {
    data: ClientDeliveryNoteItem[]
    totalPages: number
  }
  currentPage: number
}

export function ClientDeliveryNotesList({
  clientId,
  initialData,
  currentPage,
}: ClientDeliveryNotesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const deliveryNotes = initialData?.data || []
  const totalPages = initialData?.totalPages || 0

  const handleRowClick = (deliveryNoteId: string) => {
    router.push(`/delivery-notes/${deliveryNoteId}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
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
                  Niciun aviz găsit.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
