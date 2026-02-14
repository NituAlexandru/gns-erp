'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  Eye,
  Calendar,
  FileText,
  MapPin,
  User,
  ExternalLink,
  CreditCard,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { NirDTO } from '@/lib/db/modules/financial/nir/nir.types'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { NIR_STATUS_MAP } from '@/lib/db/modules/financial/nir/nir.constants'

const formatMoney = (amount: number | undefined | null, currency = 'RON') => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatNumber = (amount: number | undefined | null) => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface NirPreviewProps {
  nir: NirDTO
}

export function NirPreview({ nir }: NirPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  const statusKey = nir.status as keyof typeof NIR_STATUS_MAP
  const statusInfo = NIR_STATUS_MAP[statusKey] || {
    name: nir.status,
    variant: 'outline',
  }

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={setIsOpen}
      openDelay={200}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8'>
          <Eye className='h-4 w-4' />
        </Button>
      </HoverCardTrigger>

      {/* Folosim un width mare pentru a acomoda designul de pagina */}
      <HoverCardContent
        className='w-[1200px] p-0 border-none shadow-2xl'
        align='end'
        side='left'
        sideOffset={16}
        collisionPadding={20}
      >
        <div className='flex flex-col gap-4 p-6 bg-background border rounded-lg max-h-[85vh] overflow-y-auto'>
          {/* --- HEADER (Copiat din Page) --- */}
          <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
            <div>
              <div className='flex items-center gap-2 text-muted-foreground mb-1 text-xs'>
                <span>Previzualizare Rapidă</span>
              </div>
              <h1 className='text-2xl font-bold tracking-tight flex items-center gap-3'>
                NIR #{nir.nirNumber}
                <Badge variant={statusInfo.variant} className='text-xs px-2 '>
                  {statusInfo.name}
                </Badge>
              </h1>
              <p className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                <Calendar className='h-3.5 w-3.5' />
                {format(new Date(nir.nirDate), 'dd MMMM yyyy', {
                  locale: ro,
                })}
              </p>
            </div>

            <div className='flex gap-2'>
              <Button variant='outline' size='sm' asChild>
                <Link href={`/admin/management/reception/nir/${nir._id}`}>
                  <ExternalLink className='mr-2 h-3.5 w-3.5' />
                  Detalii
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          {/* --- INFO CARDS GRID (Copiat din Page) --- */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* Card 1: Părți Implicate */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Informații Părți
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary/10 p-2 rounded-full mt-1'>
                    <User className='h-4 w-4 text-primary' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground uppercase'>
                      Furnizor
                    </p>
                    <p className='font-medium'>{nir.supplierSnapshot.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      CUI: {nir.supplierSnapshot.cui}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <div className='bg-orange-100 p-2 rounded-full mt-1'>
                    <MapPin className='h-4 w-4 text-orange-600' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground uppercase'>
                      Gestiune Destinație
                    </p>
                    <p className='font-medium text-xs'>
                      {nir.companySnapshot.name}
                    </p>
                    <p className='text-xs font-bold text-foreground'>
                      Locatie stoc:{' '}
                      {LOCATION_NAMES_MAP[
                        nir.destinationLocation as keyof typeof LOCATION_NAMES_MAP
                      ] || nir.destinationLocation}
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-3 pt-2 border-t'>
                  <span className='text-xs text-muted-foreground'>
                    Recepționat de:
                  </span>
                  <span className='text-xs font-medium'>
                    {nir.receivedBy.name}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Documente Suport */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Documente Suport
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex justify-between items-start p-2 rounded bg-muted/20 border'>
                  <div className='flex flex-col'>
                    <span className='text-xs font-semibold text-muted-foreground uppercase'>
                      Recepție(i) Origine
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {nir.receptionId && nir.receptionId.length > 0
                        ? `${nir.receptionId.length} recepții atașate`
                        : 'NIR Manual (Fără recepție)'}
                    </span>
                  </div>

                  {/* AICI AM ADĂUGAT LINK-URILE */}
                  <div className='flex flex-col gap-1 items-end'>
                    {nir.receptionId && nir.receptionId.length > 0 ? (
                      nir.receptionId.map((recId, idx) => (
                        <Button
                          key={recId}
                          size='sm'
                          variant='ghost'
                          className='h-6 px-2 text-xs hover:bg-background hover:text-primary'
                          asChild
                        >
                          <Link href={`/admin/management/reception/${recId}`}>
                            <ExternalLink className='h-3 w-3 mr-1' />
                            Vezi Recepția {idx + 1}
                          </Link>
                        </Button>
                      ))
                    ) : (
                      <span className='text-xs text-muted-foreground italic p-1'>
                        -
                      </span>
                    )}
                  </div>
                </div>

                {nir.invoices.map((inv: any, idx: number) => (
                  <div
                    key={idx}
                    className='flex justify-between items-center text-xs'
                  >
                    <div className='flex items-center gap-2'>
                      <CreditCard className='h-4 w-4 text-muted-foreground' />
                      <span>
                        Factura:{' '}
                        <span className='font-medium'>
                          Serie {inv.series} nr. {inv.number}
                        </span>
                      </span>
                    </div>
                    <span className='text-muted-foreground text-xs'>
                      {format(new Date(inv.date), 'dd.MM.yyyy')}
                    </span>
                  </div>
                ))}

                {nir.deliveries.map((del: any, idx: number) => (
                  <div
                    key={idx}
                    className='flex justify-between items-center text-xs'
                  >
                    <div className='flex items-center gap-2'>
                      <Truck className='h-4 w-4 text-muted-foreground' />
                      <span>
                        Aviz:{' '}
                        <span className='font-medium'>
                          Serie {del.dispatchNoteSeries} nr.{' '}
                          {del.dispatchNoteNumber}
                        </span>
                      </span>
                    </div>
                    <span className='text-muted-foreground text-xs'>
                      {format(new Date(del.dispatchNoteDate), 'dd.MM.yyyy')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Card 3: Sumar Valoric */}
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Sumar Valoric
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>
                    Total Marfă (Net):
                  </span>
                  <span>{formatMoney(nir.totals.productsSubtotal)}</span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground'>
                    Total Ambalaje (Net):
                  </span>
                  <span>{formatMoney(nir.totals.packagingSubtotal)}</span>
                </div>
                <Separator />
                <div className='flex justify-between text-xs font-bold'>
                  <span> Valoare Intrare Stoc (Net):</span>
                  <span>
                    {formatMoney(
                      nir.totals.productsSubtotal +
                        nir.totals.packagingSubtotal,
                    )}
                  </span>
                </div>
                <div className='flex justify-between text-xs font-bold'>
                  <span>Total Factură (Cu TVA):</span>
                  <span>
                    {formatMoney(
                      nir.totals.grandTotal -
                        (nir.totals.transportSubtotal +
                          nir.totals.transportVat),
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* --- TABEL DETALII (Copiat din Page) --- */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <FileText className='h-5 w-5' /> Detalii Recepție
                  </CardTitle>
                  <CardDescription>
                    Lista articolelor intrate în gestiune.
                  </CardDescription>
                </div>
                <Badge variant='outline' className='text-xs'>
                  Articole: {nir.items.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow>
                    <TableHead className='w-[40px]'>#</TableHead>
                    <TableHead>Denumire Articol</TableHead>
                    <TableHead className='text-center w-[50px]'>U.M.</TableHead>
                    <TableHead className='text-right'>Cant. Doc.</TableHead>
                    <TableHead className='text-right'>Cant. Recepț.</TableHead>
                    <TableHead className='text-right'>Dif.</TableHead>
                    <TableHead className='text-right font-bold'>
                      Preț Unitar
                    </TableHead>
                    <TableHead className='text-right text-muted-foreground'>
                      Valoare Net
                    </TableHead>
                    <TableHead className='text-right text-muted-foreground'>
                      TVA
                    </TableHead>
                    <TableHead className='text-right'>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nir.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className='font-medium py-0 text-xs text-muted-foreground'>
                        {index + 1}
                      </TableCell>
                      <TableCell className='py-0'>
                        <div className='flex flex-col'>
                          <span
                            className='font-medium truncate max-w-[250px] block cursor-pointer'
                            title={item.productName}
                          >
                            {item.productName}
                          </span>
                          <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                            <span>Cod: {item.productCode}</span>
                            <span>|</span>
                            <span>
                              {item.stockableItemType === 'Packaging'
                                ? 'Ambalaj'
                                : 'Marfă'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-center text-xs text-muted-foreground py-0'>
                        {item.unitMeasure}
                      </TableCell>
                      <TableCell className='text-right font-mono py-0'>
                        {formatNumber(item.documentQuantity)}
                      </TableCell>
                      <TableCell className='text-right font-mono font-bold py-0'>
                        {formatNumber(item.quantity)}
                      </TableCell>
                      <TableCell className='text-right font-mono py-0'>
                        <span
                          className={`${item.quantityDifference !== 0 ? (item.quantityDifference < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold') : 'text-muted-foreground'}`}
                        >
                          {formatNumber(item.quantityDifference)}
                        </span>
                      </TableCell>
                      <TableCell className='text-right font-mono font-bold py-0'>
                        {formatMoney(item.invoicePricePerUnit)}
                      </TableCell>
                      <TableCell className='text-right font-mono text-muted-foreground py-0'>
                        {formatMoney(item.lineValue)}
                      </TableCell>
                      <TableCell className='text-right font-mono text-muted-foreground py-0'>
                        {formatMoney(item.lineVatValue)}
                      </TableCell>
                      <TableCell className='text-right font-mono font-medium py-0'>
                        {formatMoney(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Rânduri Totaluri */}
                  <TableRow className='border-t-1'>
                    <TableCell
                      colSpan={8}
                      className='text-right font-medium text-slate-600 py-0'
                    >
                      Total Net (Fără TVA):
                    </TableCell>
                    <TableCell className='text-right font-bold text-slate-700 font-mono py-0'>
                      {formatMoney(
                        nir.totals.subtotal - nir.totals.transportSubtotal,
                      )}
                    </TableCell>
                    <TableCell className='py-0'></TableCell>
                  </TableRow>

                  <TableRow className='border-none'>
                    <TableCell
                      colSpan={8}
                      className='text-right font-medium text-slate-600 py-0'
                    >
                      Total TVA:
                    </TableCell>
                    <TableCell className='text-right font-bold text-slate-700 font-mono py-0'>
                      {formatMoney(
                        nir.totals.vatTotal - nir.totals.transportVat,
                      )}
                    </TableCell>
                    <TableCell className='py-0'></TableCell>
                  </TableRow>

                  <TableRow className='bg-slate-900 hover:bg-slate-900 border-t border-slate-800 py-0'>
                    <TableCell
                      colSpan={8}
                      className='text-right font-bold text-white py-0'
                    >
                      TOTAL GENERAL DE PLATĂ (CU TVA):
                    </TableCell>
                    <TableCell className='py-0'></TableCell>
                    <TableCell className='text-right font-bold text-green-400 text-lg font-mono py-0 pr-4'>
                      {formatMoney(
                        nir.totals.grandTotal -
                          (nir.totals.transportSubtotal +
                            nir.totals.transportVat),
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
