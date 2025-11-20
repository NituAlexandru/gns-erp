'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  PopulatedInvoice,
  InvoiceFilters,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { InvoicesFilters } from './InvoicesFilters'
import { useDebounce } from '@/hooks/use-debounce'
import qs from 'query-string'
import { cn, formatCurrency } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Upload } from 'lucide-react'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { EFacturaStatusBadge } from './EFacturaStatusBadge'
import { toast } from 'sonner'
import {
  approveInvoice,
  rejectInvoice,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
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
import { Input } from '@/components/ui/input'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'

interface InvoicesListProps {
  initialData: {
    data: PopulatedInvoice[]
    totalPages: number
  }
  currentPage: number
  isAdmin: boolean // Vom folosi asta pentru aprobări
}

export function InvoicesList({
  initialData,
  currentPage,
  isAdmin,
}: InvoicesListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<PopulatedInvoice[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(currentPage)
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const debouncedFilters = useDebounce(filters, 500)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [invoiceToActOn, setInvoiceToActOn] = useState<PopulatedInvoice | null>(
    null
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fetchInvoices = () => {
        startTransition(async () => {
          const url = qs.stringifyUrl(
            {
              url: '/api/invoices',
              query: { ...debouncedFilters, page },
            },
            { skipNull: true, skipEmptyString: true }
          )

          try {
            const res = await fetch(url)
            const result = await res.json()
            setInvoices(result.data || [])
            setTotalPages(result.totalPages || 0)
          } catch (error) {
            console.error('Failed to fetch filtered invoices:', error)
            setInvoices([])
            setTotalPages(0)
          }
        })
      }
      fetchInvoices()
    }
  }, [debouncedFilters, page])

  const handleFiltersChange = (newFilters: Partial<InvoiceFilters>) => {
    setPage(1) // Resetează pagina la orice filtru nou
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handleApprove = (invoice: PopulatedInvoice) => {
    startTransition(async () => {
      const result = await approveInvoice(invoice._id.toString())
      if (result.success) {
        toast.success(result.message)
        // Actualizăm datele local, fără un re-fetch complet
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoice._id
              ? { ...inv, status: 'APPROVED', eFacturaStatus: 'PENDING' }
              : inv
          )
        )
      } else {
        toast.error('Eroare la aprobare', { description: result.message })
      }
    })
  }

  const handleReject = () => {
    if (!invoiceToActOn) return
    startTransition(async () => {
      const result = await rejectInvoice(
        invoiceToActOn._id.toString(),
        rejectionReason
      )
      if (result.success) {
        toast.success(result.message)
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoiceToActOn._id
              ? { ...inv, status: 'REJECTED', rejectionReason: rejectionReason }
              : inv
          )
        )
      } else {
        toast.error('Eroare la respingere', { description: result.message })
      }
      setIsRejectModalOpen(false)
      setInvoiceToActOn(null)
      setRejectionReason('')
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      <InvoicesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nr. Factură</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Data Emiterii</TableHead>
              <TableHead>Data Scadenței</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>eFactura</TableHead>
              <TableHead className='text-right'>Total</TableHead>
              {isAdmin && (
                <>
                  <TableHead className='text-right'>Profit</TableHead>
                  <TableHead className='text-right'>Marjă</TableHead>
                </>
              )}
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={9} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice._id.toString()}
                  className='hover:bg-muted/50'
                >
                  <TableCell className='font-medium'>
                    <div className='flex flex-col'>
                      <span>
                        {invoice.seriesName}-{invoice.invoiceNumber}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {invoice.invoiceType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.clientId?.name || 'N/A'}</TableCell>
                  <TableCell>{invoice.createdByName || 'N/A'}</TableCell>
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      {/* 1. Toată lumea vede Statusul */}
                      <EFacturaStatusBadge status={invoice.eFacturaStatus} />

                      {/* 2. Doar Adminul vede acțiunile sau codul */}
                      {isAdmin && (
                        <>
                          {/* CAZ A: Trebuie trimisă (PENDING sau REJECTED_ANAF) */}
                          {(invoice.eFacturaStatus === 'PENDING' ||
                            invoice.eFacturaStatus === 'REJECTED_ANAF') && (
                            <Button
                              variant='outline'
                              size='icon'
                              className='h-7 w-7'
                              title='Încarcă în SPV'
                              // Buton activ doar dacă factura este finalizată (Aprobată/Plătită)
                              disabled={
                                !(
                                  invoice.status === 'APPROVED' ||
                                  invoice.status === 'PAID' ||
                                  invoice.status === 'PARTIAL_PAID'
                                )
                              }
                              onClick={() =>
                                toast.info('Modulul e-Factura este în lucru.')
                              }
                            >
                              <Upload className='h-4 w-4' />
                            </Button>
                          )}

                          {/* CAZ B: A fost deja trimisă (SENT sau ACCEPTED) - Afișăm ID Placeholder */}
                          {(invoice.eFacturaStatus === 'SENT' ||
                            invoice.eFacturaStatus === 'ACCEPTED') && (
                            <span className='text-[10px] font-mono text-muted-foreground border px-1 py-0.5 rounded bg-muted'>
                              {/* Aici va veni invoice.eFacturaUploadId real */}
                              ID: 3040...
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(invoice.totals.grandTotal)}
                  </TableCell>
                  {isAdmin && (
                    <>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          getProfitColorClass(invoice.totals.totalProfit)
                        )}
                      >
                        {invoice.invoiceType !== 'STORNO'
                          ? formatCurrency(invoice.totals.totalProfit)
                          : '-'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-xs',
                          getMarginColorClass(invoice.totals.profitMargin)
                        )}
                      >
                        {invoice.invoiceType !== 'STORNO'
                          ? `${invoice.totals.profitMargin}%`
                          : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(`/financial/invoices/${invoice._id}`)
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(
                              `/financial/invoices/${invoice._id.toString()}/edit`
                            )
                          }
                          disabled={
                            invoice.status !== 'CREATED' &&
                            invoice.status !== 'REJECTED'
                          }
                        >
                          Modifică
                        </DropdownMenuItem>

                        {/* --- ÎNCEPUT BLOC ACȚIUNI ADMIN --- */}
                        {/* Afișăm aceste acțiuni doar dacă ești admin */}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-green-600 focus:text-green-700'
                              onSelect={() => handleApprove(invoice)}
                              disabled={
                                invoice.status !== 'CREATED' &&
                                invoice.status !== 'REJECTED'
                              }
                            >
                              Aprobă Factura
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onSelect={() => {
                                setInvoiceToActOn(invoice)
                                setIsRejectModalOpen(true)
                              }}
                              disabled={invoice.status !== 'CREATED'}
                            >
                              Respinge Factura
                            </DropdownMenuItem>
                          </>
                        )}
                        {/* --- SFÂRȘIT BLOC ACȚIUNI ADMIN --- */}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className='text-red-500'>
                          Anulează
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className='text-center h-24'>
                  Nicio factură găsită.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}

      <AlertDialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Respinge Factura</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să respingi factura{' '}
              <strong>
                {invoiceToActOn?.seriesName}-{invoiceToActOn?.invoiceNumber}
              </strong>
              ? Te rugăm introdu un motiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder='Motivul respingerii (obligatoriu)...'
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setInvoiceToActOn(null)
                setRejectionReason('')
              }}
            >
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending || rejectionReason.length < 3}
            >
              {isPending ? 'Se respinge...' : 'Da, respinge factura'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
