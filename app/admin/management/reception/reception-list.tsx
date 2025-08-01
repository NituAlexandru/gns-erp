'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import type { PopulatedReception } from '@/lib/db/modules/reception/types'

type ReceptionRow = PopulatedReception & {
  createdBy?: { name: string }
  createdAt?: string
}

interface Props {
  initialData: PopulatedReception[]
  currentPage: number
}

export default function ReceptionList({ initialData, currentPage }: Props) {
  const router = useRouter()
  const [page, setPage] = useState(currentPage)
  const pageSize = 10
  const totalPages = Math.ceil(initialData.length / pageSize)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReceptionRow | null>(null)

  const displayList = (initialData as ReceptionRow[]).slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const fetchPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    router.replace(`/admin/management/reception?page=${newPage}`)
    setPage(newPage)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      const res = await fetch(
        `/api/admin/management/reception/${deleteTarget._id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Eroare la server')
      router.replace('/admin/management/reception')
    } catch (e) {
      console.error(e)
    } finally {
      setDeleteOpen(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Recepții</h1>
        <Button asChild variant='default'>
          <Link href='/admin/management/reception/create'>
            Adaugă Recepție Nouă
          </Link>
        </Button>
      </div>

      {/* Info paginare */}
      <p className='text-sm text-muted-foreground'>
        Afișez {(page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, initialData.length)} din {initialData.length}{' '}
        recepții
      </p>

      {/* Tabel */}
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data Recepție</TableHead>
              <TableHead>Avize (serie / nr. / dată / oră)</TableHead>
              <TableHead>Facturi (serie / nr. / dată / oră)</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creat de</TableHead>
              <TableHead>Creat la</TableHead>
              <TableHead className='text-center'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayList.map((rec) => {
              const userName = rec.createdBy?.name ?? '–'
              const createdAtRaw = rec.createdAt

              // calculează totalul
              const productsSum = (rec.products ?? []).reduce(
                (s, p) => s + (p.priceAtReception ?? 0) * (p.quantity ?? 0),
                0
              )
              const packagingSum = (rec.packagingItems ?? []).reduce(
                (s, p) => s + (p.priceAtReception ?? 0) * (p.quantity ?? 0),
                0
              )
              const totalSum = productsSum + packagingSum

              return (
                <TableRow key={rec._id}>
                  <TableCell>
                    <Link href={`/admin/management/reception/${rec._id}`}>
                      {rec.supplier?.name || '–'}
                    </Link>
                  </TableCell>

                  {/* Data Recepției */}
                  <TableCell>
                    {format(new Date(rec.receptionDate), 'dd/MM/yyyy HH:mm')}
                  </TableCell>

                  {/* Avize */}
                  <TableCell>
                    {(rec.deliveries ?? []).length > 0
                      ? rec.deliveries!.map((d, i) => (
                          <div key={i}>
                            {d.dispatchNoteSeries?.toUpperCase()}
                            {' - '}
                            {d.dispatchNoteNumber}{' '}
                            {d.dispatchNoteDate &&
                              `- ${format(
                                new Date(d.dispatchNoteDate),
                                'dd/MM/yyyy HH:mm'
                              )}`}
                          </div>
                        ))
                      : '–'}
                  </TableCell>

                  {/* Facturi */}
                  <TableCell>
                    {(rec.invoices ?? []).length > 0
                      ? rec.invoices!.map((inv, i) => (
                          <div key={i}>
                            {inv.series?.toUpperCase()} - {inv.number}{' '}
                            {inv.date &&
                              `- ${format(
                                new Date(inv.date),
                                'dd/MM/yyyy HH:mm'
                              )}`}
                          </div>
                        ))
                      : '–'}
                  </TableCell>

                  {/* Total */}
                  <TableCell>{formatCurrency(totalSum)}</TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={rec.status === 'DRAFT' ? 'secondary' : 'default'}
                    >
                      {rec.status}
                    </Badge>
                  </TableCell>

                  {/* Creat de */}
                  <TableCell>{userName}</TableCell>

                  {/* Creat la */}
                  <TableCell>
                    {createdAtRaw
                      ? format(new Date(createdAtRaw), 'dd/MM/yyyy HH:mm')
                      : '–'}
                  </TableCell>

                  {/* Acțiuni */}
                  <TableCell className='text-center'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={(e) => e.stopPropagation()}
                        >
                          Acțiuni
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() =>
                            router.push(
                              `/admin/management/reception/${rec._id}`
                            )
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() =>
                            router.push(
                              `/admin/management/reception/${rec._id}/edit`
                            )
                          }
                        >
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() => {
                            setDeleteTarget(rec)
                            setDeleteOpen(true)
                          }}
                        >
                          Șterge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Ștergere */}
      {deleteTarget && (
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
            setDeleteOpen(open)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <Button variant='destructive' onClick={handleDeleteConfirm}>
                Șterge
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-4 mt-4'>
          <Button
            variant='outline'
            onClick={() => fetchPage(page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <span>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => fetchPage(page + 1)}
            disabled={page >= totalPages}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
