'use client'

import { useFormContext } from 'react-hook-form'
import {
  InvoiceInput,
  InvoiceTotals,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { Skeleton } from '@/components/ui/skeleton'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'

// Helper pentru rândul de total
const TotalRow = ({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className?: string
}) => (
  <div className={cn('flex items-center justify-between', className)}>
    <span className='text-muted-foreground'>{label}</span>
    <span className='font-medium'>{value}</span>
  </div>
)

// Helper pentru rândul de profit (ACUM VA FI FOLOSIT)
const ProfitRow = ({
  label,
  profit,
  margin,
}: {
  label: string
  profit: number
  margin: number
}) => (
  <div className='flex items-center justify-between pl-5'>
    <span className='text-xs text-muted-foreground'>{label}</span>
    <div className='flex items-center gap-7'>
      <span
        className={cn(
          'font-medium text-xs w-[40px] text-right',
          getMarginColorClass(margin)
        )}
      >
        {margin}%
      </span>
      <span
        className={cn(
          'font-medium w-[100px] text-right',
          getProfitColorClass(profit)
        )}
      >
        {formatCurrency(profit)}
      </span>
    </div>
  </div>
)

export function InvoiceFormTotals() {
  const { watch } = useFormContext<InvoiceInput>()
  const totals = watch('totals') as InvoiceTotals
  const watchedInvoiceType = watch('invoiceType')
  const isStorno = watchedInvoiceType === 'STORNO'

  const { data: session, status } = useSession()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())
  const isLoadingSession = status === 'loading'

  const {
    productsSubtotal = 0,
    productsVat = 0,
    productsProfit = 0,
    productsMargin = 0,
    packagingSubtotal = 0,
    packagingVat = 0,
    packagingProfit = 0,
    packagingMargin = 0,
    servicesSubtotal = 0,
    servicesVat = 0,
    servicesProfit = 0,
    servicesMargin = 0,
    manualSubtotal = 0,
    manualVat = 0,
    manualProfit = 0,
    manualMargin = 0,
    subtotal = 0,
    vatTotal = 0,
    grandTotal = 0,
    totalCost = 0,
    totalProfit = 0,
    profitMargin = 0,
  } = totals || {}

  return (
    <Card className='bg-muted/50'>
      <CardHeader className='pb-0 pt-0'>
        <CardTitle>Totaluri Factură</CardTitle>
      </CardHeader>
      <CardContent className='space-y-0 text-sm'>
        <div className='space-y-0'>
          <TotalRow
            label='Subtotal Produse'
            value={formatCurrency(productsSubtotal)}
          />
          <TotalRow label='TVA Produse' value={formatCurrency(productsVat)} />
          {isAdmin && !isStorno && (
            <ProfitRow
              label='Profit Produse'
              profit={productsProfit}
              margin={productsMargin}
            />
          )}
        </div>

        {/* --- Ambalaje --- */}
        <hr className='my-1 border-dashed' />
        <div className='space-y-0'>
          <TotalRow
            label='Subtotal Ambalaje'
            value={formatCurrency(packagingSubtotal)}
          />
          <TotalRow label='TVA Ambalaje' value={formatCurrency(packagingVat)} />
          {isAdmin && !isStorno && (
            <ProfitRow
              label='Profit Ambalaje'
              profit={packagingProfit}
              margin={packagingMargin}
            />
          )}
        </div>

        {/* --- Servicii --- */}
        <hr className='my-1 border-dashed' />
        <div className='space-y-0'>
          <TotalRow
            label='Subtotal Servicii'
            value={formatCurrency(servicesSubtotal)}
          />
          <TotalRow label='TVA Servicii' value={formatCurrency(servicesVat)} />
          {isAdmin && !isStorno && (
            <ProfitRow
              label='Profit Servicii'
              profit={servicesProfit}
              margin={servicesMargin}
            />
          )}
        </div>

        {/* --- Linii Manuale --- */}
        <hr className='my-1 border-dashed' />
        <div className='space-y-0'>
          <TotalRow
            label='Subtotal Linii Manuale'
            value={formatCurrency(manualSubtotal)}
          />
          <TotalRow
            label='TVA Linii Manuale'
            value={formatCurrency(manualVat)}
          />
          {isAdmin && !isStorno && (
            <ProfitRow
              label='Profit Linii Manuale'
              profit={manualProfit}
              margin={manualMargin}
            />
          )}
        </div>

        <hr className='my-1 border-dashed' />

        {/* --- Totaluri Generale --- */}
        <TotalRow
          label='Subtotal General (fără TVA)'
          value={formatCurrency(subtotal)}
        />
        <TotalRow label='Total TVA' value={formatCurrency(vatTotal)} />
        <TotalRow
          label='Total General (cu TVA)'
          value={formatCurrency(grandTotal)}
          className='text-base font-bold'
        />

        {/* --- Total Profit (Doar Admin) --- */}
        {isLoadingSession && <Skeleton className='h-5 w-full mt-1' />}
        {isAdmin && !isStorno && !isLoadingSession && (
          <div className='space-y-1 pt-1 border-t border-dashed'>
            <TotalRow
              label='Total Cost (FIFO)'
              value={`- ${formatCurrency(totalCost)}`}
              className='text-destructive'
            />
            <div className='flex items-center justify-between text-base font-bold'>
              <span className='text-muted-foreground'>Profit Total</span>
              <div
                className={cn('text-right', getProfitColorClass(totalProfit))}
              >
                <span>{formatCurrency(totalProfit)}</span>
                <span
                  className={cn('text-xs', getMarginColorClass(profitMargin))}
                >
                  {' '}
                  | {profitMargin}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
