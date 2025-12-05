import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'
import { TotalRow } from './InvoiceDetails.helpers'
import { Info } from 'lucide-react'

interface InvoiceSummaryProps {
  invoice: PopulatedInvoice
  isAdmin: boolean
}

// Helper specific for this component to keep it self-contained as requested
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

export function InvoiceSummary({ invoice, isAdmin }: InvoiceSummaryProps) {
  const { totals } = invoice
  const isStorno = invoice.invoiceType === 'STORNO'

  return (
    <div className='space-y-2'>
      <Card className='bg-muted/50 py-2 gap-2'>
        <CardHeader className='p-0 pl-6 pt-2'>
          <CardTitle>Totaluri Factură</CardTitle>
        </CardHeader>

        <CardContent className='space-y-0 text-sm '>
          {/* Products */}
          <div className='space-y-0'>
            <TotalRow
              label='Subtotal Produse'
              value={formatCurrency(totals.productsSubtotal)}
            />
            <TotalRow
              label='TVA Produse'
              value={formatCurrency(totals.productsVat)}
            />
            {isAdmin && !isStorno && (
              <ProfitRow
                label='Profit Produse'
                profit={totals.productsProfit}
                margin={totals.productsMargin}
              />
            )}
          </div>

          {/* Packaging (dacă e folosit) */}
          {totals.packagingSubtotal !== 0 && (
            <>
              <hr className='my-1 border-dashed' />
              <div className='space-y-0'>
                <TotalRow
                  label='Subtotal Ambalaje'
                  value={formatCurrency(totals.packagingSubtotal)}
                />
                <TotalRow
                  label='TVA Ambalaje'
                  value={formatCurrency(totals.packagingVat)}
                />
                {isAdmin && !isStorno && (
                  <ProfitRow
                    label='Profit Ambalaje'
                    profit={totals.packagingProfit}
                    margin={totals.packagingMargin}
                  />
                )}
              </div>
            </>
          )}

          {/* Services (dacă e folosit) */}
          {totals.servicesSubtotal !== 0 && (
            <>
              <hr className='my-1 border-dashed' />
              <div className='space-y-0'>
                <TotalRow
                  label='Subtotal Servicii'
                  value={formatCurrency(totals.servicesSubtotal)}
                />
                <TotalRow
                  label='TVA Servicii'
                  value={formatCurrency(totals.servicesVat)}
                />
                {isAdmin && !isStorno && (
                  <ProfitRow
                    label='Profit Servicii'
                    profit={totals.servicesProfit}
                    margin={totals.servicesMargin}
                  />
                )}
              </div>
            </>
          )}

          {/* Manual (dacă e folosit) */}
          {totals.manualSubtotal !== 0 && (
            <>
              <hr className='my-1 border-dashed' />
              <div className='space-y-0'>
                <TotalRow
                  label='Subtotal Linii Manuale'
                  value={formatCurrency(totals.manualSubtotal)}
                />
                <TotalRow
                  label='TVA Linii Manuale'
                  value={formatCurrency(totals.manualVat)}
                />
                {isAdmin && !isStorno && (
                  <ProfitRow
                    label='Profit Linii Manuale'
                    profit={totals.manualProfit}
                    margin={totals.manualMargin}
                  />
                )}
              </div>
            </>
          )}

          <hr className='my-1 border-dashed' />

          {/* Totaluri Generale */}
          <TotalRow
            label='Total (fără TVA)'
            value={formatCurrency(totals.subtotal)}
          />
          <TotalRow label='Total TVA' value={formatCurrency(totals.vatTotal)} />
          <TotalRow
            label='Total de plata'
            value={formatCurrency(totals.grandTotal)}
            className='text-base font-bold'
          />

          {/* --- Total Profit (Doar Admin) --- */}
          {isAdmin && !isStorno && (
            <div className='space-y-1 pt-1 border-t border-dashed'>
              <TotalRow
                label='Total Cost (FIFO)'
                value={`- ${formatCurrency(totals.totalCost)}`}
                className='text-destructive'
              />
              <div className='flex items-center justify-between text-base font-bold'>
                <span className='text-muted-foreground'>Profit Total</span>

                <div
                  className={cn(
                    'text-right',
                    getProfitColorClass(totals.totalProfit)
                  )}
                >
                  <span>{formatCurrency(totals.totalProfit)}</span>
                  <span
                    className={cn(
                      'text-xs',
                      getMarginColorClass(totals.profitMargin)
                    )}
                  >
                    {' '}
                    | {totals.profitMargin}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* CARD NOTE */}
      <Card className='py-2 gap-0 pb-6'>
        <CardHeader className='py-0'>
          <CardTitle className='text-sm font-semibold flex items-center gap-2'>
            <Info className='h-4 w-4' /> Mențiuni
            <span className='text-muted-foreground'>(Note Factură)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className=''>
          <div className='text-sm bg-muted/30 p-2 rounded-md border border-dashed h-full'>
            {invoice.notes || 'Nu există mențiuni.'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
