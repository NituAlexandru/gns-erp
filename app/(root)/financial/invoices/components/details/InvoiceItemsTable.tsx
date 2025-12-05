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
import { formatCurrency } from '@/lib/utils'
import { getSmartDescription } from './InvoiceDetails.helpers'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'

interface InvoiceItemsTableProps {
  items: PopulatedInvoice['items']
  currentUserRole: string
}

export function InvoiceItemsTable({
  items,
  currentUserRole,
}: InvoiceItemsTableProps) {
  const isAdmin = SUPER_ADMIN_ROLES.includes(
    currentUserRole?.toLowerCase() || ''
  )

  return (
    <Card className='py-2 gap-0'>
      <CardHeader className='pl-1'>
        <CardTitle className='text-base font-semibold flex items-center gap-2'>
          <ShoppingCart className='h-4 w-4'/> Produse și Servicii
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader className='bg-muted/50'>
            {/* Rândul 1: Titlurile Coloanelor */}
            <TableRow>
              <TableHead className='w-[30px]'>#</TableHead>
              <TableHead>Descriere Produs</TableHead>
              <TableHead>Cant.</TableHead>
              <TableHead>UM</TableHead>
              <TableHead className='text-right'>Preț Unitar</TableHead>
              <TableHead className='text-right'>Valoare</TableHead>
              <TableHead className='text-right'>TVA %</TableHead>
              <TableHead className='text-right'>Valoare TVA</TableHead>
              <TableHead className='text-right'>Total</TableHead>
              {isAdmin && (
                <TableHead className='text-right text-green-600 w-[100px]'>
                  Profit
                </TableHead>
              )}
            </TableRow>
            {/* 👇 Rândul 2 (NOU): Numerotarea Coloanelor (1-9) */}
            <TableRow className='h-6 hover:bg-transparent border-t-0'>
              <TableHead className=' h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                0
              </TableHead>
              <TableHead className=' h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                1
              </TableHead>
              <TableHead className=' h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                2
              </TableHead>
              <TableHead className='text-left h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                3
              </TableHead>
              <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                4
              </TableHead>
              <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                5
              </TableHead>
              <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                6
              </TableHead>
              <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                7
              </TableHead>
              <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                8
              </TableHead>
              {isAdmin && (
                <TableHead className='text-right h-6 py-0 text-[10px] font-normal text-muted-foreground'>
                  9
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item, index) => {
              const smartDesc = getSmartDescription(item)

              return (
                <TableRow key={item._id?.toString() || index}>
                  <TableCell className='text-xs text-muted-foreground'>
                    {index + 1}
                  </TableCell>
                  <TableCell className='p-1 py-0'>
                    <div className='font-medium'>{item.productName}</div>
                    <div className='flex gap-2 items-center'>
                      {item.productCode && item.productCode !== 'N/A' && (
                        <div className='text-muted-foreground flex items-center gap-1 '>
                          <Hash className='h-3 w-3' /> {item.productCode}
                        </div>
                      )}
                      {smartDesc && (
                        <span className='text-muted-foreground'>-</span>
                      )}

                      {smartDesc && (
                        <div className='text-[11px] text-muted-foreground font-medium'>
                          {smartDesc}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className=' font-medium'>
                    {item.quantity}
                  </TableCell>
                  <TableCell className='text-xs lowercase'>
                    {item.unitOfMeasure}
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className='text-right font-medium'>
                    {formatCurrency(item.lineValue)}
                  </TableCell>
                  <TableCell className='text-right text-xs'>
                    {item.vatRateDetails.rate}%
                  </TableCell>
                  <TableCell className='text-right text-xs'>
                    {formatCurrency(item.vatRateDetails.value)}
                  </TableCell>
                  <TableCell className='text-right font-bold'>
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className='text-right'>
                      <div className='flex flex-col items-end'>
                        {/* 👇 AICI FOLOSIM FUNCȚIILE HELPER */}
                        <span
                          className={`font-medium text-xs ${getProfitColorClass(item.lineProfit || 0)}`}
                        >
                          {formatCurrency(item.lineProfit || 0)}
                        </span>
                        <span
                          className={`text-[10px] ${getMarginColorClass(item.lineMargin || 0)}`}
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
