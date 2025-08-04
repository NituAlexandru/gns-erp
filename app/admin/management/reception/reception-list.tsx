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
import type {
  PopulatedReception,
  ReceptionFilters,
} from '@/lib/db/modules/reception/types'
import { SearchFilters } from '@/components/shared/receptions/search-filters'
import { PAGE_SIZE } from '@/lib/constants'

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
                          onSelect={() =>
                            router.push(
                              `/admin/management/reception/${rec._id}`
                            )
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(
                              `/admin/management/reception/${rec._id}/edit`
                            )
                          }
                        >
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuItem
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
