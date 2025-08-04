'use client'

import React, { useMemo, useState, useCallback } from 'react'
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import type {
  PopulatedReception,
  ReceptionFilters,
} from '@/lib/db/modules/reception/types'
import { SearchFilters } from '@/components/shared/receptions/search-filters'
import { PAGE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'

type ReceptionRow = PopulatedReception & {
  createdBy?: { _id: string; name: string }
  createdAt?: string
}

interface Props {
  initialData: PopulatedReception[]
  currentPage: number
}

export default function ReceptionList({ initialData, currentPage }: Props) {
  const router = useRouter()
  const [filters, setFilters] = useState<ReceptionFilters>({
    q: '',
    status: 'ALL',
    createdBy: 'ALL',
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [page, setPage] = useState(currentPage)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReceptionRow | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ReceptionRow | null>(null)
  const [isRevoking] = useState(false)

  const handleFiltersChange = useCallback((newFilters: ReceptionFilters) => {
    setFilters(newFilters)
    setPage(newFilters.page ?? 1)
  }, [])

  const filteredData = useMemo(() => {
    return initialData.filter((rec) => {
      const deliveries = rec.deliveries ?? []
      const invoices = rec.invoices ?? []

      // Construim un șir de caractere în care căutăm q
      const haystack = [
        rec.supplier?.name,
        rec.createdBy?.name,
        format(new Date(rec.receptionDate), 'dd/MM/yyyy HH:mm'),
        ...deliveries.map((d) => d.dispatchNoteNumber),
        ...invoices.map((i) => i.number),
        (
          (rec.products ?? []).reduce(
            (s, p) => s + (p.priceAtReception ?? 0) * (p.quantity ?? 0),
            0
          ) +
          (rec.packagingItems ?? []).reduce(
            (s, p) => s + (p.priceAtReception ?? 0) * (p.quantity ?? 0),
            0
          )
        ).toFixed(2),
      ]
        .join(' ')
        .toLowerCase()

      //  text liber
      if (filters.q && !haystack.includes(filters.q.toLowerCase())) {
        return false
      }
      //  status
      if (
        filters.status &&
        filters.status !== 'ALL' &&
        rec.status !== filters.status
      ) {
        return false
      }
      // creat de
      if (
        filters.createdBy &&
        filters.createdBy !== 'ALL' &&
        rec.createdBy?._id !== filters.createdBy
      ) {
        return false
      }

      return true
    })
  }, [initialData, filters])

  const totalPages = Math.ceil(filteredData.length / filters.pageSize)
  const displayList = filteredData.slice(
    (page - 1) * filters.pageSize,
    page * filters.pageSize
  )

  function fetchPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return
    router.replace(`/admin/management/reception?page=${newPage}`)
    setPage(newPage)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    const promise = new Promise(async (resolve, reject) => {
      const res = await fetch(
        `/api/admin/management/receptions/${deleteTarget._id}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const errorData = await res.json()
        return reject(new Error(errorData.message || 'Eroare la server'))
      }

      // Nu avem nevoie să procesăm un răspuns JSON la succes
      resolve(res)
    })

    toast.promise(promise, {
      loading: 'Se șterge recepția...',
      success: () => {
        router.refresh()
        setDeleteOpen(false)
        setDeleteTarget(null)
        return 'Recepția a fost ștearsă cu succes!'
      },
      error: (err) => {
        setDeleteOpen(false) // <-- Închide dialogul la eroare
        setDeleteTarget(null)
        return err.message
      },
    })
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return

    const targetId = revokeTarget._id

    const promise = new Promise(async (resolve, reject) => {
      const response = await fetch(
        `/api/admin/management/receptions/${targetId}/revoke`,
        { method: 'POST' }
      )
      if (!response.ok) {
        const result = await response.json()
        return reject(
          new Error(result.message || 'A apărut o eroare la revocare.')
        )
      }
      resolve(true)
    })

    toast.promise(promise, {
      loading: 'Se revocă confirmarea...',
      success: () => {
        router.refresh() // Reîmprospătează lista

        toast.success('Recepție revocată!', {
          description: 'Recepția a fost adusă în starea "Ciornă" (Draft).',
          action: {
            label: 'Editează Acum',
            onClick: () =>
              router.push(`/admin/management/reception/${targetId}/edit`),
          },
          duration: 20000,
        })

        return 'Operațiune finalizată.'
      },
      error: (err) => err.message,
    })

    setRevokeTarget(null) // Închide dialogul de confirmare
    setDeleteOpen(false)
  }

  return (
    <div className='space-y-4'>
      {/* Header + filtre */}
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Recepții</h1>

        <div className='flex gap-2'>
          <SearchFilters initial={filters} onChange={handleFiltersChange} />
          <Button
            variant='outline'
            onClick={() =>
              handleFiltersChange({
                q: '',
                status: 'ALL',
                createdBy: 'ALL',
                page: 1,
                pageSize: filters.pageSize,
              })
            }
          >
            Resetează
          </Button>
        </div>

        <Button asChild variant='default'>
          <Link href='/admin/management/reception/create'>
            Adaugă Recepție Nouă
          </Link>
        </Button>
      </div>

      {/* Info paginare */}
      <p className='text-sm text-muted-foreground'>
        Afișez {(page - 1) * filters.pageSize + 1}–
        {Math.min(page * filters.pageSize, filteredData.length)} din{' '}
        {filteredData.length} recepții
      </p>

      {/* Tabel */}
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data Recepție</TableHead>
              <TableHead>Avize</TableHead>
              <TableHead>Facturi</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creat de</TableHead>
              <TableHead>Creat la</TableHead>
              <TableHead className='text-center'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayList.map((rec) => {
              const deliveries = rec.deliveries ?? []
              const invoices = rec.invoices ?? []
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
                  <TableCell>
                    {format(new Date(rec.receptionDate), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {deliveries.length > 0
                      ? deliveries.map((d, i) => (
                          <div key={i}>
                            {d.dispatchNoteSeries?.toUpperCase()} –{' '}
                            {d.dispatchNoteNumber} –{' '}
                            {format(new Date(d.dispatchNoteDate), 'dd/MM/yyyy')}
                          </div>
                        ))
                      : '–'}
                  </TableCell>
                  <TableCell>
                    {invoices.length > 0
                      ? invoices.map((inv, i) => (
                          <div key={i}>
                            {inv.series?.toUpperCase()} – {inv.number} –{' '}
                            {format(new Date(inv.date), 'dd/MM/yyyy')}
                          </div>
                        ))
                      : '–'}
                  </TableCell>
                  <TableCell>{formatCurrency(totalSum)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={rec.status === 'DRAFT' ? 'secondary' : 'default'}
                    >
                      {rec.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{rec.createdBy?.name || '–'}</TableCell>
                  <TableCell>
                    {rec.createdAt
                      ? format(new Date(rec.createdAt), 'dd/MM/yyyy HH:mm')
                      : '–'}
                  </TableCell>
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
                          disabled={rec.status === 'CONFIRMAT'}
                        >
                          Editează
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className='text-orange-400 focus:text-yellow-500 cursor-pointer'
                          onSelect={() => setRevokeTarget(rec)}
                          disabled={rec.status !== 'CONFIRMAT'}
                        >
                          Revocă Confirmarea
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className='text-red-500 focus:text-red-600 cursor-pointer'
                          onSelect={() => {
                            setDeleteTarget(rec)
                            setDeleteOpen(true)
                          }}
                          disabled={rec.status === 'CONFIRMAT'}
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
              <AlertDialogDescription>
                Această acțiune este ireversibilă și va șterge definitiv
                recepția. Ești sigur că vrei să continui?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant='destructive' onClick={handleDeleteConfirm}>
                  Șterge
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* --- DIALOG NOU PENTRU REVOCARE --- */}
      {revokeTarget && (
        <AlertDialog
          open={!!revokeTarget}
          onOpenChange={() => setRevokeTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmi revocarea?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune va anula mișcările de stoc corespunzătoare și va
                readuce recepția la starea (Draft), permițând modificarea ei.
                Ești sigur?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeConfirm}
                disabled={isRevoking}
              >
                {isRevoking ? 'Se revocă...' : 'Da, revocă'}
              </AlertDialogAction>
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
