'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Link from 'next/link'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  FileText,
  MapPin,
  User,
  Printer,
  Loader2,
  ExternalLink,
  CreditCard,
  Truck,
} from 'lucide-react'
import { getNirById } from '@/lib/db/modules/financial/nir/nir.actions'
import { NIR_STATUS_MAP } from '@/lib/db/modules/financial/nir/nir.constants'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { toast } from 'sonner'
import { NirDTO } from '@/lib/db/modules/financial/nir/nir.types'

interface Props {
  params: Promise<{ id: string }>
}

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

export default function NirPage({ params }: Props) {
  const [id, setId] = useState<string | null>(null)
  const [nir, setNir] = useState<NirDTO | null>(null)
  const [loading, setLoading] = useState(true)

  // Stări pentru PDF
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    params.then((p) => {
      setId(p.id)
      getNirById(p.id).then((result) => {
        setNir(result.success ? (result.data ?? null) : null)
        setLoading(false)
      })
    })
  }, [params])

  const handlePrintPreview = async () => {
    if (!id) return
    setIsGeneratingPdf(true)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(id, 'NIR')

      if (result.success) {
        setPrintData(result.data)
        setIsPreviewOpen(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className='p-8 flex flex-col items-center justify-center h-64'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-sm text-muted-foreground mt-2'>Se încarcă NIR...</p>
      </div>
    )
  }

  if (!nir) {
    return (
      <div className='p-6'>
        <Card className='border-destructive/50'>
          <CardContent className='pt-6 flex flex-col items-center justify-center h-40'>
            <p className='text-lg font-medium text-muted-foreground'>
              NIR-ul nu a fost găsit.
            </p>
            <Button variant='outline' className='mt-4' asChild>
              <Link href='/admin/management/reception'>
                <ArrowLeft className='mr-2 h-4 w-4' /> Înapoi la Recepții
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusKey = nir.status as keyof typeof NIR_STATUS_MAP
  const statusInfo = NIR_STATUS_MAP[statusKey] || {
    name: nir.status,
    variant: 'outline',
  }

  return (
    <div className='space-y-4 p-2'>
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
            <span>NIR Detalii</span>
          </div>
          <h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
            NIR #{nir.nirNumber}
            <Badge variant={statusInfo.variant} className='text-base px-3 py-1'>
              {statusInfo.name}
            </Badge>
          </h1>
          <p className='text-muted-foreground mt-1 flex items-center gap-2'>
            <Calendar className='h-4 w-4' />
            {format(new Date(nir.nirDate), 'dd MMMM yyyy', {
              locale: ro,
            })}
          </p>
        </div>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={handlePrintPreview}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Printer className='mr-2 h-4 w-4' />
            )}
            Printează
          </Button>
        </div>
      </div>

      <Separator />

      {/* --- INFO CARDS --- */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Card 1: Părți Implicate & Locație */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
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
                <p className='font-medium text-sm'>
                  {nir.companySnapshot.name}
                </p>
                <p className='text-sm font-bold text-foreground'>
                  Locatie stoc:{' '}
                  {
                    LOCATION_NAMES_MAP[
                      nir.destinationLocation as keyof typeof LOCATION_NAMES_MAP
                    ]
                  }
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3 pt-2 border-t'>
              <span className='text-xs text-muted-foreground'>
                Recepționat de:
              </span>
              <span className='text-sm font-medium'>{nir.receivedBy.name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Documente Suport */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
              Documente Suport
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center p-2 rounded bg-muted/20 border'>
              <div className='flex flex-col'>
                <span className='text-xs font-semibold text-muted-foreground uppercase'>
                  Recepția Origine
                </span>
                <span className='text-xs text-muted-foreground'>
                  Click pentru detalii
                </span>
              </div>
              <Button size='sm' variant='ghost' asChild>
                <Link href={`/admin/management/reception/${nir.receptionId}`}>
                  <ExternalLink className='h-4 w-4' />
                </Link>
              </Button>
            </div>

            {nir.invoices.map((inv: any, idx: number) => (
              <div
                key={idx}
                className='flex justify-between items-center text-sm'
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
                className='flex justify-between items-center text-sm'
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

            {nir.orderRef && (
              <div className='pt-2 border-t text-xs text-muted-foreground'>
                Ref. Comandă ID:{' '}
                <span className='font-mono'>
                  {nir.orderRef.toString().slice(-6)}...
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Sumar Valoric Rapid */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
              Sumar Valoric
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {/* 1. Total Marfă */}
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Total Marfă (Net):</span>
              <span>{formatMoney(nir.totals.productsSubtotal)}</span>
            </div>

            {/* 2. Total Ambalaje */}
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>
                Total Ambalaje (Net):
              </span>
              <span>{formatMoney(nir.totals.packagingSubtotal)}</span>
            </div>

            <Separator />

            {/* 3. Valoare Intrare Stoc (Marfă + Ambalaje) - FĂRĂ TRANSPORT */}
            <div className='flex justify-between text-sm font-bold'>
              <span> Valoare Intrare Stoc (Net):</span>
              <span>
                {formatMoney(
                  nir.totals.productsSubtotal + nir.totals.packagingSubtotal,
                )}
              </span>
            </div>

            {/* 4. Total Factură (Scădem tot transportul: Net + TVA) */}
            <div className='flex justify-between text-sm font-bold'>
              <span>Total Factură (Cu TVA):</span>
              <span>
                {formatMoney(
                  nir.totals.grandTotal -
                    (nir.totals.transportSubtotal + nir.totals.transportVat),
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- ITEMS TABLE --- */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <FileText className='h-5 w-5' /> Detalii Recepție
              </CardTitle>
              <CardDescription>
                Lista articolelor intrate în gestiune și calculul costului de
                achiziție.
              </CardDescription>
            </div>
            <Badge variant='outline' className='text-sm'>
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
                <TableHead className='text-right'>Diferențe</TableHead>
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
                  <TableCell className='font-medium py-0.5 text-xs text-muted-foreground'>
                    {index + 1}
                  </TableCell>

                  {/* Denumire + Cod + Tip */}
                  <TableCell className='py-0.5'>
                    <div className='flex flex-col'>
                      <span className='font-medium'>{item.productName}</span>
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

                  {/* U.M. */}
                  <TableCell className='text-center text-xs text-muted-foreground py-0.5'>
                    {item.unitMeasure}
                  </TableCell>

                  {/* Cantitate Document */}
                  <TableCell className='text-right font-mono py-0.5'>
                    {formatNumber(item.documentQuantity)}
                  </TableCell>

                  {/* Cantitate Recepționată */}
                  <TableCell className='text-right font-mono font-bold py-0.5'>
                    {formatNumber(item.quantity)}
                  </TableCell>

                  {/* Diferențe */}
                  <TableCell className='text-right font-mono py-0.5'>
                    <span
                      className={`${
                        item.quantityDifference !== 0
                          ? item.quantityDifference < 0
                            ? 'text-red-600 font-bold'
                            : 'text-green-600 font-bold'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatNumber(item.quantityDifference)}
                    </span>
                  </TableCell>

                  {/* Preț Unitar (Factură) */}
                  <TableCell className='text-right font-mono font-bold py-0.5'>
                    {formatMoney(item.invoicePricePerUnit)}
                  </TableCell>

                  {/* Valoare Net */}
                  <TableCell className='text-right font-mono text-muted-foreground py-0.5'>
                    {formatMoney(item.lineValue)}
                  </TableCell>

                  {/* TVA */}
                  <TableCell className='text-right font-mono text-muted-foreground py-0.5'>
                    {formatMoney(item.lineVatValue)}
                  </TableCell>

                  {/* Total */}
                  <TableCell className='text-right font-mono font-medium py-0.5'>
                    {formatMoney(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Rânduri Totaluri */}
              <TableRow className=' border-t-1'>
                <TableCell
                  colSpan={8}
                  className='text-right font-medium text-slate-600 py-2'
                >
                  Total Net (Fără TVA):
                </TableCell>
                <TableCell className='text-right font-bold text-slate-700 font-mono py-2'>
                  {formatMoney(
                    nir.totals.subtotal - nir.totals.transportSubtotal,
                  )}
                </TableCell>
                <TableCell className='py-2'></TableCell>
              </TableRow>

              <TableRow className=' border-none'>
                <TableCell
                  colSpan={8}
                  className='text-right font-medium text-slate-600 py-1'
                >
                  Total TVA:
                </TableCell>
                <TableCell className='text-right font-bold text-slate-700 font-mono py-2'>
                  {formatMoney(nir.totals.vatTotal - nir.totals.transportVat)}
                </TableCell>
                <TableCell className='py-2'></TableCell>
              </TableRow>

              <TableRow className='bg-slate-900 hover:bg-slate-900 border-t border-slate-800'>
                <TableCell
                  colSpan={8}
                  className='text-right font-bold text-white py-3'
                >
                  TOTAL GENERAL DE PLATĂ (CU TVA):
                </TableCell>
                <TableCell className='py-3'></TableCell>
                <TableCell className='text-right font-bold text-green-400 text-lg font-mono py-3 pr-4'>
                  {formatMoney(
                    nir.totals.grandTotal -
                      (nir.totals.transportSubtotal + nir.totals.transportVat),
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL PREVIZUALIZARE PDF */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </div>
  )
}
