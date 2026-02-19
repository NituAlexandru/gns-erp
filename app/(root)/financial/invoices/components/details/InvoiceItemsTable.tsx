import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Hash, ShoppingCart } from 'lucide-react'
import { formatCurrency, cn, formatCurrency3 } from '@/lib/utils'
import { getSmartDescription } from './InvoiceDetails.helpers'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface InvoiceItemsTableProps {
  items: PopulatedInvoice['items']
  currentUserRole: string
  isPreview?: boolean
}

export function InvoiceItemsTable({
  items,
  currentUserRole,
  isPreview = false,
}: InvoiceItemsTableProps) {
  const isAdmin = SUPER_ADMIN_ROLES.includes(
    currentUserRole?.toLowerCase() || '',
  )

  // --- STILURI DINAMICE ---
  const rowHeightClass = isPreview ? 'py-0 h-6' : 'py-1'
  const textSizeClass = isPreview ? 'text-xs' : 'text-xs'
  const headerTextSize = isPreview ? 'text-xs' : 'text-sm'
  const iconSize = isPreview ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <Card className='py-2 gap-0'>
      <CardHeader className='pl-1'>
        <CardTitle
          className={cn(
            'font-semibold flex items-center gap-2',
            isPreview ? 'text-sm' : 'text-base',
          )}
        >
          <ShoppingCart className={iconSize} /> Produse și Servicii
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader className='bg-muted/50'>
            {/* Rândul 1: Titlurile Coloanelor */}
            <TableRow>
              <TableHead className={cn('w-[30px]', headerTextSize)}>
                #
              </TableHead>
              <TableHead className={headerTextSize}>Descriere Produs</TableHead>
              <TableHead className={headerTextSize}>Cant.</TableHead>
              <TableHead className={headerTextSize}>UM</TableHead>
              <TableHead className={cn('text-right', headerTextSize)}>
                Preț Unitar
              </TableHead>
              <TableHead className={cn('text-right', headerTextSize)}>
                Valoare
              </TableHead>
              <TableHead className={cn('text-right', headerTextSize)}>
                TVA %
              </TableHead>
              <TableHead className={cn('text-right', headerTextSize)}>
                Valoare TVA
              </TableHead>
              <TableHead className={cn('text-right', headerTextSize)}>
                Total
              </TableHead>
              {isAdmin && (
                <TableHead
                  className={cn(
                    'text-right text-green-600 w-[100px]',
                    headerTextSize,
                  )}
                >
                  Profit
                </TableHead>
              )}
            </TableRow>
            {/* Rândul 2: Numerotarea Coloanelor */}
            <TableRow className='h-6 hover:bg-transparent border-t-0'>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, isAdmin ? 9 : null]
                .filter((x) => x !== null)
                .map((i) => (
                  <TableHead
                    key={i}
                    className={cn(
                      'h-6 py-0 font-normal text-muted-foreground',
                      headerTextSize,
                      i !== null && i >= 4 && 'text-right',
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

              return (
                <TableRow
                  key={item._id?.toString() || index}
                  className={rowHeightClass}
                >
                  <TableCell
                    className={cn(
                      'text-muted-foreground font-mono py-0',
                      textSizeClass,
                    )}
                  >
                    {index + 1}
                  </TableCell>
                  <TableCell className='p-1 py-0'>
                    {/* Tooltip pentru Nume Produs */}
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'font-medium max-w-[250px] xl:max-w-[400px] truncate cursor-help', // Am adaugat truncate si cursor
                              textSizeClass,
                            )}
                          >
                            {item.productName}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className=' break-words'>
                          <p className='text-xs'>{item.productName}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Restul conținutului (Cod, SmartDesc) rămâne neschimbat */}
                    <div className='flex gap-2 items-center'>
                      {item.productCode && item.productCode !== 'N/A' && (
                        <div
                          className={cn(
                            'text-muted-foreground flex items-center gap-1',
                            textSizeClass,
                          )}
                        >
                          <Hash className={cn(iconSize)} /> {item.productCode}
                        </div>
                      )}
                      {smartDesc && (
                        <span className='text-muted-foreground'>-</span>
                      )}
                      {smartDesc && (
                        <div
                          className={cn(
                            'text-muted-foreground font-medium',
                            isPreview ? 'text-xs' : 'text-[11px]',
                          )}
                        >
                          {smartDesc}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn('font-medium', textSizeClass)}>
                    {item.quantity}
                  </TableCell>
                  <TableCell className={cn('lowercase', textSizeClass)}>
                    {item.unitOfMeasure}
                  </TableCell>
                  <TableCell className={cn('text-right', textSizeClass)}>
                    {formatCurrency3(item.unitPrice)}
                  </TableCell>
                  <TableCell
                    className={cn('text-right font-medium', textSizeClass)}
                  >
                    {formatCurrency(item.lineValue)}
                  </TableCell>
                  <TableCell className={cn('text-right', textSizeClass)}>
                    {item.vatRateDetails.rate}%
                  </TableCell>
                  <TableCell className={cn('text-right', textSizeClass)}>
                    {formatCurrency(item.vatRateDetails.value)}
                  </TableCell>
                  <TableCell
                    className={cn('text-right font-bold', textSizeClass)}
                  >
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className='text-right'>
                      <div className='flex flex-col items-end'>
                        <span
                          className={cn(
                            'font-medium',
                            getProfitColorClass(item.lineProfit || 0),
                            textSizeClass,
                          )}
                        >
                          {formatCurrency(item.lineProfit || 0)}
                        </span>
                        <span
                          className={cn(
                            getMarginColorClass(item.lineMargin || 0),
                            isPreview ? 'text-xs' : 'text-xs',
                          )}
                        >
                          {item.lineMargin || 0}%
                        </span>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
