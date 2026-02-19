import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Box, Hash, Package } from 'lucide-react'
import { getSmartDescription } from './DeliveryNoteDetails.helpers'
import { Barcode } from '@/components/barcode/barcode-image'
import { cn, formatCurrency } from '@/lib/utils'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'

interface DeliveryNoteItemsTableProps {
  items: DeliveryNoteDTO['items']
  isPreview?: boolean
  isAdmin?: boolean
  status?: string
}

export function DeliveryNoteItemsTable({
  items,
  isPreview = false,
  isAdmin = false,
  status = 'CREATED',
}: DeliveryNoteItemsTableProps) {
  const totalsByUM = items.reduce(
    (acc, item) => {
      const um = item.unitOfMeasure.toLowerCase()
      acc[um] = (acc[um] || 0) + item.quantity
      return acc
    },
    {} as Record<string, number>,
  )

  const financialTotals = items.reduce(
    (acc, item) => {
      acc.net += item.lineValue || 0
      acc.vat += item.lineVatValue || 0
      acc.gross += item.lineTotal || 0

      const isProduct = item.stockableItemType === 'ERPProduct'

      if (isProduct) {
        const cost = item.lineCostFIFO || 0
        const revenue = item.lineValue || 0
        acc.productProfit += revenue - cost
        acc.productRevenue += revenue
      }

      return acc
    },
    { net: 0, vat: 0, gross: 0, productProfit: 0, productRevenue: 0 },
  )

  const totalMargin =
    financialTotals.productRevenue > 0
      ? (financialTotals.productProfit / financialTotals.productRevenue) * 100
      : 0

  const rowHeightClass = isPreview ? 'py-0 h-6' : 'py-1'
  const textSizeClass = isPreview ? 'text-xs' : 'text-sm'
  const headerTextSize = isPreview ? 'text-[10px]' : 'text-xs'
  const hasCostData = ['DELIVERED', 'INVOICED'].includes(status)
  const headerIndices = isAdmin
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

  return (
    <Card className='py-2 gap-0'>
      <CardHeader className='pl-1'>
        <CardTitle
          className={cn(
            'font-semibold flex items-center gap-2',
            isPreview ? 'text-sm' : 'text-base',
          )}
        >
          <Box className={cn(isPreview ? 'h-3 w-3' : 'h-4 w-4')} /> Produse
          Livrate
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader className='bg-muted/50'>
            {/* Rândul 1: Titluri */}
            <TableRow>
              <TableHead className={cn('w-[40px]', textSizeClass)}>#</TableHead>
              <TableHead className={textSizeClass}>Cod Produs</TableHead>
              <TableHead className={textSizeClass}>Cod Bare</TableHead>
              <TableHead className={textSizeClass}>Descriere Produs</TableHead>
              <TableHead className={cn('w-[80px] text-center', textSizeClass)}>
                UM
              </TableHead>
              <TableHead className={cn('text-right', textSizeClass)}>
                Cantitate
              </TableHead>
              <TableHead className={cn('text-right', textSizeClass)}>
                Preț Unitar
              </TableHead>
              <TableHead className={cn('text-right', textSizeClass)}>
                Valoare
              </TableHead>
              <TableHead className={cn('text-right', textSizeClass)}>
                TVA
              </TableHead>
              <TableHead className={cn('text-right', textSizeClass)}>
                Total
              </TableHead>
              {isAdmin && (
                <TableHead className={cn('text-right ', textSizeClass)}>
                  Profit
                </TableHead>
              )}
            </TableRow>
            <TableRow className='h-6 hover:bg-transparent border-t-0'>
              {headerIndices.map((i) => (
                <TableHead
                  key={i}
                  className={cn(
                    'h-6 py-0 font-normal text-muted-foreground',
                    headerTextSize,
                    i === 4 && 'text-center',
                    i >= 5 && 'text-right',
                  )}
                >
                  {i}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item, index) => {
              const smartDesc = getSmartDescription(item)
              const profit = (item.lineValue || 0) - (item.lineCostFIFO || 0)
              const margin = item.lineValue
                ? (profit / item.lineValue) * 100
                : 0
              const formattedProfit =
                Math.round((profit + Number.EPSILON) * 100) / 100
              const formattedMargin =
                Math.round((margin + Number.EPSILON) * 100) / 100

              return (
                <TableRow key={index} className={rowHeightClass}>
                  <TableCell
                    className={cn(
                      'text-muted-foreground font-mono py-0',
                      textSizeClass,
                    )}
                  >
                    {index + 1}
                  </TableCell>
                  <TableCell className='py-0'>
                    {item.productCode && item.productCode !== 'N/A' ? (
                      <div
                        className={cn(
                          'text-muted-foreground flex items-center gap-1',
                          textSizeClass,
                        )}
                      >
                        <Hash
                          className={cn(isPreview ? 'h-2.5 w-2.5' : 'h-3 w-3')}
                        />{' '}
                        {item.productCode}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className='py-1'>
                    {item.productBarcode ? (
                      <div className='py-0'>
                        <Barcode
                          text={item.productBarcode}
                          width={isPreview ? 150 : 250}
                          height={isPreview ? 40 : 70}
                          type='code128'
                        />
                      </div>
                    ) : (
                      <div className='flex items-center gap-2 opacity-20 select-none'></div>
                    )}
                  </TableCell>
                  <TableCell className='py-0'>
                    <div className={cn('font-medium', textSizeClass)}>
                      {item.productName}
                    </div>

                    {/* Afisare Badge-uri cu date deja structurate din getSmartDescription */}
                    {smartDesc && smartDesc.length > 0 && (
                      <div className='flex flex-wrap items-center gap-1 m-0'>
                        <Package
                          className={cn(
                            'text-primary',
                            isPreview ? 'h-4 w-4' : 'h-4 w-4',
                          )}
                        />{' '}
                        <span
                          className={cn(
                            'text-muted-foreground/80 font-semibold tracking-wide',
                            isPreview ? 'text-xs' : 'text-xs',
                          )}
                        >
                          Mod ambalare:
                        </span>
                        {smartDesc.map((eq, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex items-center gap-0 rounded border border-muted-foreground/20 bg-muted/20 text-muted-foreground whitespace-nowrap',
                              isPreview
                                ? 'px-1 py-0 text-xs'
                                : 'px-2 py-0.5 text-xs',
                            )}
                          >
                            <span>
                              <strong className='text-foreground/90 font-bold'>
                                {eq.val}
                              </strong>{' '}
                              {eq.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'py-0 lowercase text-muted-foreground text-center',
                      textSizeClass,
                    )}
                  >
                    {item.unitOfMeasure}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right py-0 font-bold',
                      isPreview ? 'text-sm' : 'text-base',
                    )}
                  >
                    {item.quantity}
                  </TableCell>

                  <TableCell className={cn('text-right py-0', textSizeClass)}>
                    {formatCurrency(item.priceAtTimeOfOrder)}
                  </TableCell>
                  <TableCell className={cn('text-right py-0', textSizeClass)}>
                    {formatCurrency(item.lineValue)}
                  </TableCell>
                  <TableCell className={cn('text-right py-0', textSizeClass)}>
                    {formatCurrency(item.lineVatValue)}
                  </TableCell>

                  <TableCell
                    className={cn(
                      'text-right py-0 font-semibold',
                      textSizeClass,
                    )}
                  >
                    {formatCurrency(item.lineTotal)}
                  </TableCell>

                  {isAdmin && (
                    <TableCell className='text-right'>
                      {hasCostData ? (
                        <div className='flex flex-col items-end'>
                          <span
                            className={cn(
                              'font-medium',
                              getProfitColorClass(formattedProfit),
                              textSizeClass,
                            )}
                          >
                            {formatCurrency(formattedProfit)}
                          </span>
                          <span
                            className={cn(
                              getMarginColorClass(formattedMargin),
                              isPreview ? 'text-[9px]' : 'text-[10px]',
                            )}
                          >
                            {formattedMargin}%
                          </span>
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>-</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}

            <TableRow className='bg-muted/30 border-t-2 p-0'>
              <TableCell
                colSpan={5}
                className={cn(
                  'text-right align-center font-semibold text-muted-foreground',
                  isPreview ? 'py-1 text-xs' : 'py-1 text-sm',
                )}
              >
                Totaluri:
              </TableCell>

              {/* Total Cantități (Sub coloana Cantitate) */}
              <TableCell className='text-right align-top'>
                <div className='flex flex-col gap-0 items-end'>
                  {Object.entries(totalsByUM).map(([um, qty]) => (
                    <div key={um} className={cn('flex gap-1', textSizeClass)}>
                      <span className='font-bold'>{qty}</span>
                      <span className='lowercase'>{um}</span>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className='py-0' />
              <TableCell
                className={cn('text-right align-top font-bold', textSizeClass)}
              >
                {formatCurrency(financialTotals.net)}
              </TableCell>
              <TableCell
                className={cn('text-right align-top font-bold', textSizeClass)}
              >
                {formatCurrency(financialTotals.vat)}
              </TableCell>
              <TableCell
                className={cn('text-right align-top font-bold', textSizeClass)}
              >
                {formatCurrency(financialTotals.gross)}
              </TableCell>

              {isAdmin && (
                <TableCell className='text-right align-top py-1'>
                  {hasCostData ? (
                    <div className='flex flex-col items-end leading-none'>
                      <span
                        className={cn(
                          'font-bold',
                          getProfitColorClass(financialTotals.productProfit),
                          textSizeClass,
                        )}
                      >
                        {formatCurrency(financialTotals.productProfit)}
                      </span>
                      <span
                        className={cn(
                          getMarginColorClass(totalMargin),
                          isPreview ? 'text-[9px]' : 'text-[10px]',
                        )}
                      >
                        {Math.round((totalMargin + Number.EPSILON) * 100) / 100}
                        %
                      </span>
                    </div>
                  ) : (
                    <span className='text-muted-foreground'>-</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
