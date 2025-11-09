'use client'

import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'

interface InvoiceDetailsProps {
  invoice: PopulatedInvoice
  isAdmin: boolean
}

// 🔽 --- HELPER-ELE PE CARE LE-AI DEFINIT DEJA (Refolosite) --- 🔽
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

function AddressDisplay({
  title,
  name,
  address,
  cui,
  regCom,
}: {
  title: string
  name: string
  address: {
    strada: string
    numar?: string
    localitate: string
    judet: string
    codPostal: string
  }
  cui: string
  regCom: string
}) {
  return (
    <div className='text-sm'>
      <h3 className='font-semibold mb-1'>{title}</h3>
      <p className='font-bold'>{name}</p>
      <p>
        {address.strada}, {address.numar ? `Nr. ${address.numar}` : ''}
      </p>
      <p>
        {address.localitate}, {address.judet}, {address.codPostal}
      </p>
      <p>CUI: {cui}</p>
      <p>Reg. Com.: {regCom}</p>
    </div>
  )
}

export function InvoiceDetails({ invoice, isAdmin }: InvoiceDetailsProps) {
  const isStorno = invoice.invoiceType === 'STORNO'
  const { totals } = invoice

  return (
    <Card className='w-full pt-2 '>
      <CardContent className='p-6 pt-0 space-y-1'>
        {/* 1. Antet Furnizor / Client (RE-ADĂUGAT) */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='flex gap-10 flex-col'>
            <AddressDisplay
              title='Furnizor'
              name={invoice.companySnapshot.name}
              cui={invoice.companySnapshot.cui}
              regCom={invoice.companySnapshot.regCom}
              address={invoice.companySnapshot.address}
            />
            <AddressDisplay
              title='Client'
              name={invoice.clientSnapshot.name}
              cui={invoice.clientSnapshot.cui}
              regCom={invoice.clientSnapshot.regCom}
              address={invoice.clientSnapshot.address}
            />
          </div>
          <Card className='bg-muted/50'>
            <CardHeader className='p-0 pl-5'>
              <CardTitle>Totaluri Factură</CardTitle>
            </CardHeader>
            <CardContent className='space-y-0 text-sm'>
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
                label='Subtotal General (fără TVA)'
                value={formatCurrency(totals.subtotal)}
              />
              <TotalRow
                label='Total TVA'
                value={formatCurrency(totals.vatTotal)}
              />
              <TotalRow
                label='Total General (cu TVA)'
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
        </div>

        <Separator />

        {/* 2. Detalii Factură (RE-ADĂUGAT) */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
          <div>
            <p className='text-muted-foreground'>Dată Emitere</p>
            <p className='font-semibold'>
              {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Dată Scadență</p>
            <p className='font-semibold'>
              {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Tip Document</p>
            <p className='font-semibold'>{invoice.invoiceType}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Creator</p>
            <p className='font-semibold'>{invoice.createdByName}</p>
          </div>
        </div>

        {/* 3. Tabel Linii (RE-ADĂUGAT) */}
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[40px]'>Nr.</TableHead>
                <TableHead>Descriere Produs/Serviciu</TableHead>
                <TableHead className='text-right'>Cant.</TableHead>
                <TableHead className='text-center'>UM</TableHead>
                <TableHead className='text-right'>Preț Unitar</TableHead>
                <TableHead className='text-right'>Valoare</TableHead>
                <TableHead className='text-center'>TVA %</TableHead>
                <TableHead className='text-right'>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={item._id.toString()}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className='font-medium'>{item.productName}</div>
                    <div className='text-xs text-muted-foreground'>
                      {item.productCode}
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>{item.quantity}</TableCell>
                  <TableCell className='text-center'>
                    {item.unitOfMeasure}
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(item.lineValue)}
                  </TableCell>
                  <TableCell className='text-center'>
                    {item.vatRateDetails.rate}%
                  </TableCell>
                  <TableCell className='text-right font-medium'>
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* 4. Totaluri (Blocul copiat din InvoiceFormTotals) */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* O coloană pentru Note */}
          <div>
            {invoice.notes && (
              <div>
                <h4 className='font-semibold mb-2'>Note</h4>
                <p className='text-sm text-muted-foreground italic'>
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
