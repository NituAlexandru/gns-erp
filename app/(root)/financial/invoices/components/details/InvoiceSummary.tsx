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
  isPreview?: boolean // <--- PROP NOU
}

// Helper specific păstrat
const ProfitRow = ({
  label,
  profit,
  margin,
  textSizeClass,
}: {
  label: string
  profit: number
  margin: number
  textSizeClass?: string
}) => (
  <div className={cn('flex items-center justify-between pl-5', textSizeClass)}>
    <span className='text-muted-foreground'>{label}</span>
    <div className='flex items-center gap-4'>
      <span
        className={cn(
          'font-medium w-[30px] text-right',
          getMarginColorClass(margin),
        )}
      >
        {margin}%
      </span>
      <span
        className={cn(
          'font-medium w-[90px] text-right',
          getProfitColorClass(profit),
        )}
      >
        {formatCurrency(profit)}
      </span>
    </div>
  </div>
)

export function InvoiceSummary({
  invoice,
  isAdmin,
  isPreview = false,
}: InvoiceSummaryProps) {
  const { totals } = invoice
  const isStorno = invoice.invoiceType === 'STORNO'

  // --- STILURI DINAMICE ---
  const textSizeClass = isPreview ? 'text-xs' : 'text-xs'
  const headerPadding = isPreview ? 'p-2 pl-3' : 'p-0 pl-6 pt-2'
  const titleSize = isPreview ? 'text-xs' : 'text-base'
  const contentPadding = isPreview ? 'space-y-0 p-2' : 'space-y-0'
  const iconSize = isPreview ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <div className='space-y-2'>
      <Card className='bg-muted/50 py-2 gap-2'>
        <CardHeader className={headerPadding}>
          <CardTitle className={titleSize}>Totaluri Factură</CardTitle>
        </CardHeader>

        <CardContent className={contentPadding}>
          <div className={textSizeClass}>
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
                  textSizeClass={textSizeClass}
                />
              )}
            </div>

            {/* Packaging */}
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
                      textSizeClass={textSizeClass}
                    />
                  )}
                </div>
              </>
            )}

            {/* Services */}
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
                      textSizeClass={textSizeClass}
                    />
                  )}
                </div>
              </>
            )}

            {/* Manual */}
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
                      textSizeClass={textSizeClass}
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
            <TotalRow
              label='Total TVA'
              value={formatCurrency(totals.vatTotal)}
            />
            <TotalRow
              label='Total de plata'
              value={formatCurrency(totals.grandTotal)}
              className={cn('font-bold', isPreview ? 'text-sm' : 'text-base')}
            />

            {/* --- Total Profit (Doar Admin) --- */}
            {isAdmin && !isStorno && (
              <div className='space-y-1 pt-1 border-t border-dashed'>
                <TotalRow
                  label='Total Cost (FIFO)'
                  value={`- ${formatCurrency(totals.totalCost)}`}
                  className='text-destructive'
                />
                <div
                  className={cn(
                    'flex items-center justify-between font-bold',
                    isPreview ? 'text-sm' : 'text-base',
                  )}
                >
                  <span className='text-muted-foreground'>Profit Total</span>
                  <div
                    className={cn(
                      'text-right',
                      getProfitColorClass(totals.totalProfit),
                    )}
                  >
                    <span>{formatCurrency(totals.totalProfit)}</span>
                    <span
                      className={cn(
                        'ml-1',
                        getMarginColorClass(totals.profitMargin),
                        isPreview ? 'text-[12px]' : 'text-sm',
                      )}
                    >
                      | {totals.profitMargin}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD NOTE */}
      <Card
        className={cn('gap-0 h-full', isPreview ? 'py-1 pb-2' : 'py-2 pb-2')}
      >
        <CardHeader className='py-0'>
          <CardTitle
            className={cn(
              'font-semibold flex items-center gap-2',
              textSizeClass,
            )}
          >
            <Info className={iconSize} /> Mențiuni
            <span className='text-muted-foreground'>(Note Factură)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={isPreview ? 'mt-1' : ''}>
          <div
            className={cn(
              'bg-muted/30 p-2 rounded-md border border-dashed h-full',
              textSizeClass,
            )}
          >
            {invoice.notes || 'Nu există mențiuni.'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
