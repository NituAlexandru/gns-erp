import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  FileText,
  MapPin,
  User,
  Package,
  CreditCard,
  Edit,
} from 'lucide-react'
import { getReceptionById } from '@/lib/db/modules/reception/reception.actions'
import type { PopulatedReception } from '@/lib/db/modules/reception/types'

interface Props {
  params: Promise<{ id: string }>
}

// Helper pentru formatare monetară
const formatMoney = (amount: number | undefined | null, currency = 'RON') => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4, // Afișăm până la 4 zecimale pentru precizie DVI
  }).format(amount)
}

export default async function ReceptionDetailPage({ params }: Props) {
  const { id } = await params
  const reception: PopulatedReception | null = await getReceptionById(id)

  if (!reception) {
    return (
      <div className='p-6'>
        <Card className='border-destructive/50'>
          <CardContent className='pt-6 flex flex-col items-center justify-center h-40'>
            <p className='text-lg font-medium text-muted-foreground'>
              Recepția nu a fost găsită.
            </p>
            <Button variant='outline' className='mt-4' asChild>
              <Link href='/admin/management/reception'>
                <ArrowLeft className='mr-2 h-4 w-4' /> Înapoi la listă
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deliveries = reception.deliveries || []
  const invoices = reception.invoices || []
  const products = reception.products || []
  const packages = reception.packagingItems || []

  // Calcule rapide pentru sumar (în caz că lipsesc totalurile pe obiect)
  const totalProducts = products.length + packages.length
  const totalTransportCost = deliveries.reduce(
    (acc, d) => acc + (d.transportCost || 0),
    0
  )
  const totalTransportVat = deliveries.reduce(
    (acc, d) =>
      acc + (d.transportCost || 0) * ((d.transportVatRate || 0) / 100),
    0
  )
  const calculateTotals = (items: any[]) => {
    return items.reduce(
      (acc, item) => {
        const net = (item.quantity || 0) * (item.invoicePricePerUnit || 0)
        const vat = net * ((item.vatRate || 0) / 100)
        return { net: acc.net + net, vat: acc.vat + vat }
      },
      { net: 0, vat: 0 }
    )
  }
  const prodTotals = calculateTotals(products)
  const pkgTotals = calculateTotals(packages)
  const totalNet = prodTotals.net + pkgTotals.net
  const totalVat = prodTotals.vat + pkgTotals.vat
  // Notă: Adunăm transportul la totalul general.
  // Dacă transportul are și el TVA, ar trebui calculat separat, dar aici îl adunăm brut la final.
  const grandTotal =
    totalNet + totalVat + totalTransportCost + totalTransportVat

  return (
    <div className='space-y-2 p-2 '>
      {/* --- HEADER --- */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Link
              href='/admin/management/reception'
              className='hover:text-foreground transition-colors'
            >
              Recepții
            </Link>
            <span>/</span>
            <span>Detalii</span>
          </div>
          <h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
            Recepție
            <Badge
              className='text-base px-3 py-1'
              variant={
                reception.status === 'CONFIRMAT' ? 'default' : 'secondary'
              }
            >
              {reception.status}
            </Badge>
          </h1>
          <p className='text-muted-foreground mt-1 flex items-center gap-2'>
            <Calendar className='h-4 w-4' />
            {format(new Date(reception.receptionDate), 'dd MMMM yyyy, HH:mm', {
              locale: ro,
            })}
          </p>
        </div>

        <div className='flex gap-2'>
          {reception.status === 'DRAFT' && (
            <Button asChild className='bg-blue-600 hover:bg-blue-700'>
              <Link href={`/admin/management/reception/${reception._id}/edit`}>
                <Edit className='mr-2 h-4 w-4' /> Modifică
              </Link>
            </Button>
          )}
          {reception.orderRef && (
            <Button variant='outline' asChild>
              <Link
                href={`/admin/management/supplier-orders/${reception.orderRef.toString()}`}
              >
                <FileText className='mr-2 h-4 w-4' /> Vezi Comanda
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* --- INFO CARDS --- */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Card 1: Furnizor & Locație */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
              Informații Generale
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-start gap-3'>
              <div className='bg-primary/10 p-2 rounded-full mt-1'>
                <User className='h-4 w-4 text-primary' />
              </div>
              <div>
                <p className='font-medium'>
                  {reception.supplierSnapshot?.name}
                </p>
                <p className='text-xs text-muted-foreground'>
                  CUI: {reception.supplierSnapshot?.cui || '-'}
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-orange-100 p-2 rounded-full mt-1'>
                <MapPin className='h-4 w-4 text-orange-600' />
              </div>
              <div>
                <p className='font-medium text-sm'>
                  {reception.destinationType === 'PROIECT'
                    ? 'Livrat la Proiect'
                    : 'Livrat în Depozit'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Locație:{' '}
                  {reception.destinationLocation || reception.destinationId}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3 pt-2 border-t'>
              <span className='text-xs text-muted-foreground'>Creat de:</span>
              <span className='text-sm font-medium'>
                {reception.createdByName || 'Sistem'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Transport & Logistică */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
              Logistică
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {deliveries.length > 0 ? (
              deliveries.map((del, idx) => (
                <div key={idx} className='text-sm space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span className='text-muted-foreground'>Aviz:</span>
                    <span className='font-mono font-bold'>
                      {del.dispatchNoteNumber}
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-muted-foreground'>Șofer:</span>
                    <span>{del.driverName || '-'}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-muted-foreground'>Auto:</span>
                    <span className='uppercase'>{del.carNumber || '-'}</span>
                  </div>
                  {del.transportCost ? (
                    <div className='pt-1 border-t space-y-1'>
                      <div className='flex justify-between items-center font-medium'>
                        <span>Cost Transport (Net):</span>
                        <span>{formatMoney(del.transportCost)}</span>
                      </div>
                      <div className='flex justify-between items-center text-xs text-muted-foreground'>
                        <span>
                          TVA Transport ({del.transportVatRate || 0}%):
                        </span>
                        <span>
                          {formatMoney(
                            (del.transportCost || 0) *
                              ((del.transportVatRate || 0) / 100)
                          )}
                        </span>
                      </div>
                      <div className='flex justify-between items-center  font-semibold text-foreground pt-1'>
                        <span>Total Transport:</span>
                        <span>
                          {formatMoney(
                            (del.transportCost || 0) +
                              (del.transportCost || 0) *
                                ((del.transportVatRate || 0) / 100)
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className='text-sm text-muted-foreground'>
                Fără detalii transport.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Sumar Financiar (Facturi) */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
              Financiar
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {invoices.length > 0 ? (
              invoices.map((inv, idx) => (
                <div key={idx} className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center gap-2'>
                      <CreditCard className='h-5 w-5' />
                      {inv.series} {inv.number}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      Scadent:{' '}
                      {inv.dueDate
                        ? format(new Date(inv.dueDate), 'dd.MM.yyyy')
                        : '-'}
                    </span>
                  </div>

                  <div className='grid grid-cols-2 gap-2 text-sm pt-2'>
                    <div>
                      <p className='text-xs text-muted-foreground'>
                        Valoare Netă
                      </p>
                      <p className='font-medium'>
                        {formatMoney(inv.amount, inv.currency)}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs text-muted-foreground'>TVA</p>
                      <p className='font-medium'>
                        {formatMoney(inv.vatValue, inv.currency)}
                      </p>
                    </div>
                  </div>
                  <div className='flex justify-between items-center pt-2 border-t mt-2'>
                    <span className='font-bold text-sm'>Total Factură:</span>
                    <span className='font-bold text-lg text-green-500'>
                      {formatMoney(inv.totalWithVat, inv.currency)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className='flex flex-col items-center justify-center h-full text-muted-foreground text-sm'>
                <p>Nicio factură atașată.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- ITEMS TABLE --- */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Package className='h-5 w-5' /> Articole Recepționate
              </CardTitle>
              <CardDescription>
                Lista detaliată a produselor și ambalajelor intrate în stoc.
              </CardDescription>
            </div>
            <Badge variant='outline' className='text-sm'>
              Total Articole: {totalProducts}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className='bg-muted/50'>
              <TableRow>
                <TableHead className='w-[40px]'>#</TableHead>
                <TableHead>Denumire Articol</TableHead>
                <TableHead className='text-center'>Cantitate</TableHead>
                <TableHead className='text-right'>Preț Factură</TableHead>
                <TableHead className='text-right'>Transp. Distribuit</TableHead>
                <TableHead className='text-right font-bold '>
                  Cost Total / Buc
                </TableHead>
                <TableHead className='text-right'>Total (Net)</TableHead>
                <TableHead className='text-right'>Valoare TVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && packages.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-center py-8 text-muted-foreground'
                  >
                    Nu există articole în această recepție.
                  </TableCell>
                </TableRow>
              )}

              {/* Produse */}
              {products.map((p, i) => (
                <TableRow key={`prod-${i}`}>
                  <TableCell className='font-medium text-xs text-muted-foreground'>
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='font-medium'>
                        {p.productName || 'Produs necunoscut'}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        Cod: {p.productCode}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge variant='secondary' className='font-mono'>
                      {p.quantity} {p.unitMeasure}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatMoney(p.invoicePricePerUnit)}
                  </TableCell>
                  <TableCell className='text-right font-mono text-muted-foreground'>
                    {p.distributedTransportCostPerUnit &&
                    p.distributedTransportCostPerUnit > 0
                      ? `+${formatMoney(p.distributedTransportCostPerUnit)}`
                      : '-'}
                  </TableCell>
                  <TableCell className='text-right font-mono font-bold'>
                    {formatMoney(p.landedCostPerUnit)}
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatMoney(
                      (p.quantity || 0) * (p.invoicePricePerUnit || 0)
                    )}
                  </TableCell>
                  <TableCell className='text-right font-mono text-muted-foreground'>
                    {formatMoney(
                      (p.quantity || 0) *
                        (p.invoicePricePerUnit || 0) *
                        ((p.vatRate || 0) / 100)
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Separator Ambalaje */}
              {packages.length > 0 && products.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-4'
                  >
                    Ambalaje / Paletizare
                  </TableCell>
                </TableRow>
              )}

              {/* Ambalaje */}
              {packages.map((p, i) => (
                <TableRow key={`amb-${i}`}>
                  <TableCell className='font-medium text-xs text-muted-foreground'>
                    {products.length + i + 1}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='font-medium'>
                        {p.packagingName || 'Ambalaj necunoscut'}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        Ambalaj Returnabil
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge variant='outline' className='font-mono'>
                      {p.quantity} {p.unitMeasure}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatMoney(p.invoicePricePerUnit)}
                  </TableCell>
                  <TableCell className='text-right text-muted-foreground'>
                    -
                  </TableCell>
                  <TableCell className='text-right font-mono font-bold'>
                    {formatMoney(p.landedCostPerUnit)}
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatMoney(
                      (p.quantity || 0) * (p.invoicePricePerUnit || 0)
                    )}
                  </TableCell>
                  <TableCell className='text-right font-mono text-muted-foreground'>
                    {formatMoney(
                      (p.quantity || 0) *
                        (p.invoicePricePerUnit || 0) *
                        ((p.vatRate || 0) / 100)
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className='bg-slate-900 hover:bg-slate-900 border-t-2 border-slate-800'>
                <TableCell
                  colSpan={5}
                  className='text-right font-bold text-white py-2'
                >
                  TOTAL GENERAL (Marfă + TVA + Transport):
                </TableCell>
                <TableCell className='text-right font-bold text-green-500 text-lg font-mono py-2'>
                  {formatMoney(grandTotal)}
                </TableCell>
                <TableCell className='text-right font-bold text-slate-300 font-mono py-2'>
                  {/* Total Net */}
                  {formatMoney(totalNet + totalTransportCost)} (Net)
                </TableCell>
                <TableCell className='text-right font-bold text-slate-300 font-mono py-2'>
                  {formatMoney(totalVat + totalTransportVat)} (TVA)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Notes (dacă există) */}
      {reception.deliveries?.[0]?.notes && (
        <Card className=' border-yellow-100'>
          <CardContent>
            <h4 className='font-semibold '>Note Aviz:</h4>
            <p>{reception.deliveries[0].notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
