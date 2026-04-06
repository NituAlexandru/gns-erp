'use client'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, cn, toSlug } from '@/lib/utils'
import { Building2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SUPPLIER_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.constants'
import { Badge } from '@/components/ui/badge'
import { SUPPLIER_INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'

interface SupplierBalancesItemProps {
  supplier: any
  onOpenInvoiceDetails: (invoiceId: string) => void
  onOpenCreatePayment: (supplierId: string, invoiceId?: string) => void
  onOpenAllocationModal: (payment: any) => void
  onCompensate: (invoiceId: string) => void
  processingId: string | null
}

export function SupplierBalancesItem({
  supplier,
  onOpenInvoiceDetails,
  onOpenCreatePayment,
  onOpenAllocationModal,
  onCompensate,
  processingId,
}: SupplierBalancesItemProps) {
  const router = useRouter()

  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  return (
    <AccordionItem
      value={supplier.supplierId}
      className='border rounded-md px-3 bg-card shadow-sm'
    >
      <AccordionTrigger className='hover:no-underline py-0 cursor-pointer'>
        <div className='flex justify-between w-full items-center gap-4 pr-1'>
          <div className='flex items-center gap-3 overflow-hidden text-left w-[300px] sm:w-[300px] lg:w-[500px] shrink-0'>
            <div className='p-1.5 bg-muted rounded-full shrink-0'>
              <Building2 className='w-5 h-5 text-primary shrink-0' />
            </div>
            <span
              className='font-semibold truncate text-sm sm:text-base hover:text-primary hover:underline transition-colors'
              title={supplier.supplierName}
              onClick={(e) => {
                e.stopPropagation()
                router.push(
                  `/admin/management/incasari-si-plati/payables/suppliers/${supplier.supplierId}/${toSlug(
                    supplier.supplierName,
                  )}?tab=payments`,
                )
              }}
            >
              {supplier.supplierName}
            </span>
          </div>

          {/* 2. COLOANA STATISTICI (Mijloc - Aliniată) */}
          <div className='hidden md:flex items-center justify-start flex-1 gap-x-1 text-xs sm:text-sm shrink-0'>
            <span className='text-muted-foreground whitespace-nowrap'>
              {supplier.invoicesCount}{' '}
              {supplier.invoicesCount === 1 ? 'factură' : 'facturi'}
            </span>
            {supplier.overdueCount > 0 && (
              <span className='text-red-500/90 font-medium whitespace-nowrap'>
                ({supplier.overdueCount}{' '}
                {supplier.overdueCount === 1 ? 'restantă' : 'restante'})
              </span>
            )}
            {supplier.paymentsCount > 0 && (
              <span className='text-green-500/90 font-medium whitespace-nowrap'>
                ({supplier.paymentsCount}{' '}
                {supplier.paymentsCount === 1
                  ? 'plată nealocată'
                  : 'plăți nealocate'}
                )
              </span>
            )}
            {supplier.compensationsCount > 0 && (
              <span className='text-red-500/90 font-medium whitespace-nowrap'>
                ({supplier.compensationsCount}{' '}
                {supplier.compensationsCount === 1
                  ? 'compensare disponibilă'
                  : 'compensări disponibile'}
                )
              </span>
            )}
          </div>

          {/* 3. COLOANA SOLD TOTAL (Aliniată la dreapta) */}
          <div className='flex items-center justify-end shrink-0 w-[120px] sm:w-[150px]'>
            <span
              className={cn(
                'font-bold text-sm sm:text-base whitespace-nowrap font-mono',
                supplier.totalBalance > 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {formatCurrency(supplier.totalBalance)}
            </span>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className='pb-3 pt-1'>
        <div className='rounded-md border overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/50'>
              <TableRow className='h-9 hover:bg-transparent border-b-0'>
                <TableHead className='h-9 text-sm uppercase font-bold text-muted-foreground'>
                  Document
                </TableHead>
                <TableHead className='h-9 text-sm uppercase font-bold text-center text-muted-foreground'>
                  Status
                </TableHead>
                <TableHead className='h-9 text-sm uppercase font-bold text-muted-foreground'>
                  Scadență
                </TableHead>
                <TableHead className='h-9 text-sm uppercase font-bold text-center text-muted-foreground'>
                  Zile Depășite
                </TableHead>
                <TableHead className='h-9 text-sm uppercase font-bold text-left text-muted-foreground'>
                  Acțiuni
                </TableHead>
                <TableHead className='h-9 text-sm uppercase font-bold text-right text-muted-foreground'>
                  Total Factură
                </TableHead>
                <TableHead className='h-9 text-sm uppercase font-bold text-right text-muted-foreground'>
                  Rest Plată
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.items.map((item: any) => {
                const isBusy = processingId === item._id

                // --- RANDARE PENTRU PLĂȚI NEALOCATE ---
                if (item.type === 'PAYMENT') {
                  const payStatusInfo = SUPPLIER_PAYMENT_STATUS_MAP[
                    item.status as keyof typeof SUPPLIER_PAYMENT_STATUS_MAP
                  ] || { name: item.status, variant: 'outline' }

                  return (
                    <TableRow
                      key={`pay-${item._id}`}
                      className={cn(
                        'h-10 border-b-0 hover:bg-muted/50 transition-colors',
                        isBusy && 'opacity-50 pointer-events-none bg-muted/50',
                      )}
                    >
                      <TableCell className='py-1 text-xs'>
                        <div className='font-medium text-foreground w-fit'>
                          {item.seriesName ? `${item.seriesName} - ` : ''}
                          {item.documentNumber}
                        </div>
                        <div className='text-xs text-green-600'>
                          Plată din {formatDate(item.date)}
                        </div>
                      </TableCell>
                      <TableCell className='py-1 text-xs text-center'>
                        <Badge
                          variant={payStatusInfo.variant as any}
                          className='h-5 text-[10px] px-1.5 whitespace-nowrap'
                        >
                          {payStatusInfo.name}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-1 text-xs text-muted-foreground'>
                        -
                      </TableCell>
                      <TableCell className='py-1 text-xs text-center'>
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-600 border border-green-200'>
                          {item.daysOverdue} zile nealocată
                        </span>
                      </TableCell>
                      <TableCell className='py-1'>
                        <Button
                          variant='outline'
                          className='h-7 text-xs px-2 cursor-pointer text-primary'
                          onClick={() => onOpenAllocationModal(item)}
                          disabled={isBusy}
                        >
                          Alocare
                        </Button>
                      </TableCell>
                      <TableCell className='py-1 text-sm text-right text-muted-foreground font-mono'>
                        {formatCurrency(item.grandTotal)}
                      </TableCell>
                      <TableCell className='py-1 text-sm text-right font-bold font-mono text-green-600'>
                        -{formatCurrency(item.remainingAmount)}
                      </TableCell>
                    </TableRow>
                  )
                }

                // --- RANDARE PENTRU FACTURI ---
                const isOverdue = item.daysOverdue > 0
                const isCompensatable =
                  item.invoiceType === 'STORNO' ||
                  item.mathematicalRemaining < 0
                const invStatusInfo = SUPPLIER_INVOICE_STATUS_MAP[
                  item.status as keyof typeof SUPPLIER_INVOICE_STATUS_MAP
                ] || { name: item.status, variant: 'outline' }

                return (
                  <TableRow
                    key={`inv-${item._id}`}
                    className={cn(
                      'h-10 border-b-0 hover:bg-muted/50 transition-colors',
                      isBusy && 'opacity-50 pointer-events-none bg-muted/50',
                    )}
                  >
                    <TableCell className='py-1 text-xs'>
                      <div
                        className='font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors w-fit'
                        onClick={() => onOpenInvoiceDetails(item._id)}
                      >
                        {item.seriesName ? `${item.seriesName} - ` : ''}
                        {item.documentNumber}
                      </div>
                      <div className=' text-muted-foreground'>
                        {item.invoiceType === 'STORNO' ? 'Storno' : 'Factură'}{' '}
                        din {formatDate(item.date)}
                      </div>
                    </TableCell>
                    <TableCell className='py-1 text-xs text-center'>
                      {isCompensatable ? (
                        <Badge
                          variant='outline'
                          className='h-5 text-[10px] px-1.5 whitespace-nowrap bg-orange-100 text-orange-800 border-orange-200'
                        >
                          De compensat
                        </Badge>
                      ) : (
                        <Badge
                          variant={invStatusInfo.variant as any}
                          className='h-5 text-[10px] px-1.5 whitespace-nowrap'
                        >
                          {invStatusInfo.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='py-1 text-xs'>
                      <span
                        className={isOverdue ? 'text-red-600 font-medium' : ''}
                      >
                        {item.dueDate ? formatDate(item.dueDate) : '-'}
                      </span>
                    </TableCell>

                    <TableCell className='py-1 text-xs text-center'>
                      {(() => {
                        if (Math.abs(item.remainingAmount) < 0.01) {
                          return (
                            <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-500 border border-green-200'>
                              Achitată
                            </span>
                          )
                        }
                        if (isCompensatable) {
                          return (
                            <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-200'>
                              De compensat
                            </span>
                          )
                        }
                        if (isOverdue) {
                          return (
                            <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 border border-red-600'>
                              {item.daysOverdue} zile
                            </span>
                          )
                        }
                        return (
                          <span className='text-muted-foreground text-[10px]'>
                            În termen
                          </span>
                        )
                      })()}
                    </TableCell>

                    <TableCell className='py-1'>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          className='h-7 text-xs px-2 cursor-pointer'
                          onClick={() => onOpenInvoiceDetails(item._id)}
                          disabled={isBusy}
                        >
                          Detalii
                        </Button>

                        {isCompensatable ? (
                          <Button
                            variant='outline'
                            className='h-7 text-xs px-2 cursor-pointer text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50'
                            onClick={() => onCompensate(item._id)}
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                            ) : null}
                            Compensează
                          </Button>
                        ) : (
                          item.mathematicalRemaining > 0 && (
                            <Button
                              variant='outline'
                              className='h-7 text-xs px-2 cursor-pointer'
                              onClick={() =>
                                onOpenCreatePayment(
                                  supplier.supplierId,
                                  item._id,
                                )
                              }
                              disabled={isBusy}
                            >
                              Plată
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>

                    <TableCell className='py-1 text-sm text-right text-muted-foreground font-mono'>
                      {formatCurrency(item.grandTotal)}
                    </TableCell>

                    <TableCell
                      className={cn(
                        'py-1 text-sm text-right font-bold font-mono',
                        item.mathematicalRemaining > 0
                          ? 'text-red-600'
                          : 'text-green-600',
                      )}
                    >
                      {item.mathematicalRemaining > 0
                        ? formatCurrency(item.mathematicalRemaining)
                        : `-${formatCurrency(Math.abs(item.mathematicalRemaining))}`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
