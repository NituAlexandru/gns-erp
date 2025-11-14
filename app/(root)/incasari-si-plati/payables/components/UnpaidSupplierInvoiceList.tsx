'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  PopulatedSupplierPayment,
  UnpaidSupplierInvoice,
} from './SupplierAllocationModal'
import { toast } from 'sonner'

type Invoice = UnpaidSupplierInvoice

interface SupplierInvoicesListProps {
  invoices: Invoice[]
  payment: PopulatedSupplierPayment | null
  onManualAllocateClick: (invoice: Invoice) => void
}

// Tipul Date poate fi string de la server
function formatDate(dateString: Date | string) {
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function UnpaidSupplierInvoiceList({
  invoices,
  payment,
  onManualAllocateClick,
}: SupplierInvoicesListProps) {
  const handleManualAllocation = (invoice: Invoice) => {
    if (!payment || payment.unallocatedAmount <= 0) {
      toast.warning('Plata nu are fonduri nealocate.')
      return
    }
    onManualAllocateClick(invoice)
  }

  // Determinăm care facturi pot fi alocate
  const unallocatedAmount = payment?.unallocatedAmount || 0

  return (
    <Card className='flex-1 flex flex-col overflow-hidden shadow-none border-dashed'>
      <CardHeader className='p-4'>
        {/* Scoatem titlul, e deja în modal */}
      </CardHeader>

      <CardContent className='flex-1 overflow-y-auto p-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factură (Nr.)</TableHead>
              <TableHead>Scadentă</TableHead>
              <TableHead className='text-right'>Rest Plată</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className='text-center'>
                  Nicio factură neplătită.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((invoice) => {
              // Dezactivăm butonul dacă plata nu are bani
              const canAllocate = unallocatedAmount > 0

              return (
                <TableRow key={invoice._id}>
                  <TableCell className='font-medium'>
                    {invoice.invoiceSeries?.toUpperCase()} -{' '}
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className='text-right font-medium'>
                    {formatCurrency(invoice.remainingAmount)}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleManualAllocation(invoice)}
                      disabled={!canAllocate}
                    >
                      Alocă
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
