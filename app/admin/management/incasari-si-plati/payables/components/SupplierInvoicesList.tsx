'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SupplierInvoiceStatus,
  SUPPLIER_INVOICE_STATUS_MAP,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import { CreateSupplierInvoiceSchema } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.validator'
import { z } from 'zod'
import { PopulatedSupplierPayment } from './SupplierAllocationModal'
import { checkSupplierHasUnallocatedPayments } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { toast } from 'sonner'

// Tipul de Invoice
type Invoice = z.infer<typeof CreateSupplierInvoiceSchema> & {
  _id: string
  status: SupplierInvoiceStatus
  paidAmount: number
  remainingAmount: number
  supplierId: { _id: string; name: string }
}

export interface SupplierInvoicesListProps {
  invoices: Invoice[]
  onOpenCreatePayment: (supplierId: string) => void
  onOpenAllocationModal: (payment: PopulatedSupplierPayment) => void
  onOpenDetailsSheet: (invoiceId: string | null) => void
  onEdit: (invoiceId: string) => void
  onDelete: (invoiceId: string) => void
}

// Adaugă corpul funcției formatDate
function formatDate(dateString: Date | string) {
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const FALLBACK_STATUS = { name: 'Necunoscut', variant: 'outline' }

export function SupplierInvoicesList({
  invoices,
  onOpenCreatePayment,
  onOpenAllocationModal,
  onOpenDetailsSheet,
  onEdit,
  onDelete,
}: SupplierInvoicesListProps) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // 1. Logica pentru "Vezi Detalii"
  const handleViewDetails = (invoiceId: string) => {
    onOpenDetailsSheet(invoiceId)
  }

  // 2. Logica pentru "Plătește Factura"
  const handlePayInvoice = async (invoice: Invoice) => {
    setIsProcessingPayment(true)
    const supplierId = invoice.supplierId._id

    try {
      const result = await checkSupplierHasUnallocatedPayments(supplierId)

      // Tratăm tipul CheckResult defensiv
      if (!result.success) {
        toast.error('Eroare la verificarea plăților.', {
          // Folosim accesul defensiv la message
          description: result.message || 'Plata nu a putut fi verificată.',
        })
        return
      }

      if (result.hasUnallocatedPayment && result.payment) {
        // Cazul 1: Există o plată nealocată -> Deschide sheet-ul de alocare
        toast.info(
          'S-a găsit o plată nealocată. Te rog să aloci suma dorită.',
          { duration: 5000 },
        )
        onOpenAllocationModal(result.payment)
      } else {
        // Cazul 2: Nu există plată nealocată -> Deschide sheet-ul de creare plată
        toast.info(
          'Nu există plăți nealocate. Te rog să creezi o plată nouă.',
          { duration: 5000 },
        )
        onOpenCreatePayment(supplierId)
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <>
      <Card className='flex-1 flex flex-col overflow-hidden'>
        <CardHeader>
          <CardTitle>Istoric Facturi Furnizori</CardTitle>
        </CardHeader>

        <CardContent className='flex-1 overflow-y-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factură (Serie - Nr.)</TableHead>
                <TableHead>Furnizor</TableHead>
                <TableHead>Data Facturii</TableHead>
                <TableHead>Data Scadenței</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Total General</TableHead>
                <TableHead className='text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className='text-center'>
                    Nu există facturi înregistrate.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((invoice) => {
                const statusInfo =
                  SUPPLIER_INVOICE_STATUS_MAP[invoice.status] || FALLBACK_STATUS

                const isPaidOrCanceled =
                  invoice.status === 'PLATITA' || invoice.status === 'ANULATA'

                return (
                  <TableRow key={invoice._id}>
                    <TableCell className='font-medium'>
                      {invoice.invoiceSeries?.toUpperCase() || ''} -{' '}
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {invoice.supplierId?.name ||
                        invoice.supplierSnapshot.name ||
                        'N/A'}
                    </TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(invoice.totals.grandTotal)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            disabled={isProcessingPayment}
                          >
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {/* 1. Vezi Detalii */}
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(invoice._id)}
                            disabled={isProcessingPayment}
                          >
                            Vezi Detalii
                          </DropdownMenuItem>

                          {/* 2. Plateste Factura (Flux Smart) */}
                          <DropdownMenuItem
                            onClick={() => handlePayInvoice(invoice)}
                            disabled={isPaidOrCanceled || isProcessingPayment}
                          >
                            {isProcessingPayment && (
                              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            )}
                            Plătește Factura
                          </DropdownMenuItem>

                          <DropdownMenuItem disabled>
                            Anulează Factură
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(invoice._id)}>
                            Editează Factura
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(invoice._id)}
                            className='text-red-600 focus:text-red-600 cursor-pointer'
                          >
                            Șterge Factura
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
