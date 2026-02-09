'use client'

import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { formatCurrency } from '@/lib/utils'
import { OrderStatusBadge } from './OrderStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { DELIVERY_METHODS } from '@/lib/db/modules/order/constants'
import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  Download,
  FileCheck,
  FileText,
  Loader2,
  Pencil,
  Printer,
  Truck,
} from 'lucide-react'
import { useState } from 'react' // Am scos 'useMemo'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import Link from 'next/link'
import { toast } from 'sonner'
import { generateProformaFromOrder } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { getActiveSeriesForDocumentType } from '@/lib/db/modules/numbering/numbering.actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface OrderDetailsViewProps {
  order: PopulatedOrder
  deliveries: IDelivery[]
}

export function OrderDetailsView({ order, deliveries }: OrderDetailsViewProps) {
  const deliveryMethodLabel =
    DELIVERY_METHODS.find((m) => m.key === order.deliveryType)?.label ||
    order.deliveryType

  const formatAddress = (addr: any) => {
    if (!addr) return '-'
    if (typeof addr === 'string') return addr

    return [
      addr.strada ? `Str. ${addr.strada}` : null,
      addr.numar ? `nr. ${addr.numar}` : null,
      addr.alteDetalii,
      addr.localitate,
      addr.judet ? `Jud. ${addr.judet}` : null,
      addr.codPostal,
    ]
      .filter(Boolean)
      .join(', ')
  }
  const deliveryAddressString = formatAddress(order.deliveryAddress)
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false)
  const [proformaSeries, setProformaSeries] = useState<SeriesDTO[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  const handlePrintAviz = async (deliveryNoteId: string) => {
    setGeneratingPdfId(deliveryNoteId)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(deliveryNoteId, 'DELIVERY_NOTE')

      if (result.success) {
        setPrintData(result.data)
        setIsPreviewOpen(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
      console.error(error)
    } finally {
      setGeneratingPdfId(null)
    }
  }
  const handleGenerateProforma = async (seriesName: string) => {
    if (!seriesName) {
      toast.error('Vă rugăm selectați o serie.')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('Se generează proforma...')

    try {
      const result = await generateProformaFromOrder(order._id, seriesName)

      if (result.success) {
        toast.success('Proforma a fost generată cu succes.', {
          id: toastId,
          description: `Nr. ${result.data.invoiceNumber}`,
        })
        setIsProformaModalOpen(false)
      } else {
        toast.error('Eroare la generare:', {
          id: toastId,
          description: result.message,
        })
      }
    } catch (error) {
      toast.error('Eroare neașteptată.', {
        id: toastId,
        description: (error as Error).message,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenProformaModal = async () => {
    setIsGenerating(true)
    try {
      const documentType = 'Proforma' as unknown as DocumentType
      const series = (await getActiveSeriesForDocumentType(
        documentType,
      )) as SeriesDTO[]

      if (!series || series.length === 0) {
        toast.error('Eroare: Nu există serii active pentru Proforme.', {
          description: 'Vă rugăm să configurați o serie în setări.',
        })
        setIsGenerating(false)
        return
      }

      if (series.length === 1) {
        // CAZ 1: O singură serie. Generăm direct.
        await handleGenerateProforma(series[0].name)
        // Funcția de mai sus se ocupă de oprirea loader-ului
      } else {
        // CAZ 2: Mai multe serii. Deschidem modalul.
        setProformaSeries(series)
        setSelectedSeries(series[0].name)
        setIsProformaModalOpen(true)
        setIsGenerating(false) // Oprim loader-ul butonului, modalul e activ
      }
    } catch (error) {
      toast.error('Eroare la încărcarea seriilor.', {
        description: (error as Error).message,
      })
      setIsGenerating(false)
    }
  }

  return (
    <div className='space-y-1'>
      {/* 1. Header Pagina  */}
      <div className='flex flex-col sm:flex-row justify-between sm:items-start gap-1'>
        <div>
          <h1 className='text-2xl font-bold'>Comandă #{order.orderNumber}</h1>
          <p className='text-muted-foreground'>
            Creată la: {new Date(order.createdAt).toLocaleString('ro-RO')} de{' '}
            {order.salesAgent?.name || 'N/A'}
          </p>
        </div>
        <div className='flex items-center gap-1'>
          <Button variant='outline' asChild title='Editează Comanda'>
            <Link href={`/orders/${order._id}/edit`}>
              Modifică Comanda <Pencil className='h-3 w-3' />
            </Link>
          </Button>

          {/* Buton Planificare Livrări */}
          <Button variant='outline' asChild title='Planifică Livrări'>
            <Link href={`/deliveries/new?orderId=${order._id}`}>
              Modifică Livrarile <Truck />
            </Link>
          </Button>
          <Button
            variant='outline'
            onClick={handleOpenProformaModal}
            disabled={order.status === 'CANCELLED' || isGenerating}
          >
            Proforma <Download />
          </Button>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-2'>
        {/* Coloana Stângă (Detalii) */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Card Detalii Client și Livrare */}
          <Card>
            <CardHeader>
              <CardTitle>Detalii Client și Livrare</CardTitle>
            </CardHeader>
            <CardContent className='text-sm space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                {/* Date Facturare */}
                <div className='col-span-1'>
                  <h3 className='font-semibold mb-1'>Date Facturare</h3>
                  <p className='font-medium '>{order.clientSnapshot.name}</p>
                  <p className='text-muted-foreground'>
                    CUI:{' '}
                    <span className='font-medium text-foreground'>
                      {' '}
                      {order.clientSnapshot.cui}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Reg. Com:{' '}
                    <span className='font-medium text-foreground'>
                      {' '}
                      {order.clientSnapshot.regCom}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Adresa:{' '}
                    <span className='font-medium text-foreground'>
                      {order.clientSnapshot.address},{' '}
                      {order.clientSnapshot.judet}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Bancă:{' '}
                    <span className='font-medium text-foreground'>
                      {' '}
                      {order.clientSnapshot.bank}
                    </span>{' '}
                  </p>
                  <p className='text-muted-foreground'>
                    IBAN:{' '}
                    <span className='font-medium text-foreground'>
                      {order.clientSnapshot.iban}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Agent Vanzare:{' '}
                    <span className='font-medium text-foreground'>
                      {order.salesAgentSnapshot.name}
                    </span>
                  </p>
                </div>

                {/* Detalii Logistice */}
                <div className='col-span-2'>
                  <h3 className='font-semibold mb-1'>Detalii Logistice</h3>

                  <p className='text-muted-foreground'>
                    Adresă de Livrare:
                    <span className='font-medium text-foreground'>
                      {deliveryAddressString}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Mod Livrare:{' '}
                    <span className='font-medium text-foreground'>
                      {deliveryMethodLabel}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Tip Vehicul Ales:{' '}
                    <span className='font-medium text-foreground'>
                      {order.estimatedVehicleType}
                    </span>
                  </p>
                  <div className='flex gap-1'>
                    <p className='text-muted-foreground'>
                      Distanță:{' '}
                      <span className='font-medium text-foreground'>
                        {order.distanceInKm} km
                      </span>
                    </p>
                    <p className='text-muted-foreground'>
                      Timp Traseu:{' '}
                      <span className='font-medium text-foreground'>
                        {formatMinutes(order.travelTimeInMinutes)}
                      </span>
                    </p>
                  </div>

                  <p className='text-muted-foreground'>
                    Cost Transport Recomandat:{' '}
                    <span className='font-medium text-foreground'>
                      {formatCurrency(order.recommendedShippingCost || 0)}
                    </span>
                  </p>
                  <div>
                    {/* Card Note Comandă */}
                    {order.notes && (
                      <div>
                        <p>Mentiuni: </p>
                        <span className='font-medium text-foreground'>
                          {order.notes}{' '}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coloana Dreaptă (Totaluri) */}
        <Card className='flex flex-col gap-2'>
          <CardHeader>
            <CardTitle>Sumar Financiar</CardTitle>
          </CardHeader>
          <CardContent className='flex-grow flex flex-col text-sm'>
            <div className='flex-grow space-y-0'>
              <div className='flex justify-between font-medium'>
                <span>Subtotal Articole</span>
                <span>{formatCurrency(order.totals.productsSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>TVA Articole</span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(order.totals.productsVat)}
                </span>
              </div>

              <div className='flex justify-between font-medium '>
                <span>Subtotal Ambalaje</span>
                <span>{formatCurrency(order.totals.packagingSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>TVA Ambalaje</span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(order.totals.packagingVat)}
                </span>
              </div>

              <div className='flex justify-between font-medium '>
                <span>Subtotal Servicii</span>
                <span>{formatCurrency(order.totals.servicesSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>TVA Servicii</span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(order.totals.servicesVat)}
                </span>
              </div>

              <div className='flex justify-between font-medium '>
                <span>Subtotal Manual</span>
                <span>{formatCurrency(order.totals.manualSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>TVA Manual</span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(order.totals.manualVat)}
                </span>
              </div>
            </div>

            <div className='mt-auto'>
              <Separator className='my-2' />
              <div className='flex justify-between text-sm font-semibold'>
                <span>Subtotal General</span>
                <span>{formatCurrency(order.totals.subtotal)}</span>
              </div>
              <div className='flex justify-between text-sm font-semibold'>
                <span>TVA General</span>
                <span>{formatCurrency(order.totals.vatTotal)}</span>
              </div>
              <div className='flex justify-between text-sm font-bold '>
                <span>Total General</span>
                <span>{formatCurrency(order.totals.grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Articole Comandă (Neschimbat) */}
        <div className='lg:col-span-3'>
          <Card className='gap-0'>
            <CardHeader>
              <CardTitle>Articole Comandă</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produs/Serviciu</TableHead>
                    <TableHead className='text-right'>
                      Cant. Comandată
                    </TableHead>
                    <TableHead className='text-right'>Cant. Livrată</TableHead>
                    <TableHead>U.M.</TableHead>
                    <TableHead className='text-right'>Preț Unitar</TableHead>
                    <TableHead className='text-right'>Valoare</TableHead>
                    <TableHead className='text-right'>Val. TVA</TableHead>
                    <TableHead className='text-right'>Total Linie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className='font-medium'>
                        {item.productName}
                      </TableCell>
                      <TableCell className='text-right'>
                        {item.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className='text-right font-bold text-blue-500'>
                        {(item.quantityShipped || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{item.unitOfMeasure}</TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(item.priceAtTimeOfOrder)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(item.lineValue)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(item.lineVatValue)}
                      </TableCell>
                      <TableCell className='text-right font-semibold'>
                        {formatCurrency(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Card 4: Livrări Planificate */}
        {deliveries && deliveries.length > 0 && (
          <div className='lg:col-span-3'>
            <Card>
              <CardHeader>
                <CardTitle>Livrări Planificate ({deliveries.length})</CardTitle>
              </CardHeader>
              <CardContent className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1'>
                {deliveries.map((delivery) => {
                  const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
                    name: 'Necunoscut',
                    variant: 'secondary',
                  }

                  return (
                    <Card
                      key={delivery._id.toString()}
                      className='bg-muted/50 flex flex-col gap-1'
                    >
                      <CardHeader className='p-0 px-4'>
                        <div className='flex flex-row items-start justify-between gap-1'>
                          <CardTitle className='text-base font-semibold flex items-center gap-1 flex-wrap'>
                            <h3 className='font-mono text-xs sm:text-sm whitespace-nowrap'>
                              Livrarea Nr. {delivery.deliveryNumber}
                            </h3>
                          </CardTitle>
                          <div className='flex flex-col items-center gap-1 flex-shrink-0'>
                            <Badge
                              variant={statusInfo.variant}
                              className='text-xs'
                            >
                              {statusInfo.name}
                            </Badge>
                            <div className='flex flex-row'>
                              {delivery.deliveryNoteId ? (
                                <div className='flex gap-1'>
                                  {/* Buton Vizualizare (Link) */}
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='h-7 w-7 p-0'
                                    asChild
                                    title='Vezi Aviz'
                                  >
                                    <Link
                                      href={`/financial/delivery-notes/${delivery.deliveryNoteId}`}
                                    >
                                      <FileText className='h-3.5 w-3.5 ' />
                                    </Link>
                                  </Button>

                                  {/* Buton Printare (Activ) */}
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='h-7 w-7 p-0'
                                    onClick={() =>
                                      handlePrintAviz(
                                        delivery.deliveryNoteId!.toString(),
                                      )
                                    }
                                    disabled={
                                      generatingPdfId ===
                                      delivery.deliveryNoteId.toString()
                                    }
                                    title='Printează Aviz'
                                  >
                                    {generatingPdfId ===
                                    delivery.deliveryNoteId.toString() ? (
                                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                    ) : (
                                      <Printer className='h-3.5 w-3.5' />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  disabled
                                  className='h-7 w-7 p-0 opacity-50'
                                >
                                  <FileText className='h-3.5 w-3.5' />
                                </Button>
                              )}
                              {delivery.relatedInvoices &&
                                delivery.relatedInvoices.length > 0 && (
                                  <div className='flex gap-1 items-center border-l pl-1 ml-1 border-gray-200 dark:border-gray-700'>
                                    {delivery.relatedInvoices.map((inv) => (
                                      <Button
                                        key={inv.invoiceId.toString()}
                                        size='sm'
                                        variant='outline'
                                        className='h-7 w-7 p-0 border-green-200 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-900/20'
                                        asChild
                                        title={`Vezi Factura ${inv.invoiceNumber}`}
                                      >
                                        <Link
                                          href={`/financial/invoices/${inv.invoiceId}`}
                                        >
                                          <FileCheck className='h-3.5 w-3.5 text-green-600 dark:text-green-400' />
                                        </Link>
                                      </Button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {/* CardContent rămâne la fel */}
                      <CardContent className='p-4 pt-0 text-sm space-y-3 flex-grow flex flex-col'>
                        <div className='flex-grow space-y-3'>
                          {delivery.deliveryDate ? (
                            // CAZ 1: Există dată programată de logistică
                            <div className='text-green-600 font-semibold border-l-2 border-green-600 pl-2'>
                              <strong>Programat:</strong>{' '}
                              {format(
                                new Date(delivery.deliveryDate), // Folosim deliveryDate
                                'PPP',
                                { locale: ro },
                              )}
                              {delivery.deliverySlots && ( // Verificăm și afișăm deliverySlot
                                <>
                                  <br />
                                  <strong>Interval:</strong>{' '}
                                  {delivery.deliverySlots.join(', ')}
                                </>
                              )}
                            </div>
                          ) : (
                            // CAZ 2: Nu există dată programată, afișăm data solicitată
                            <div>
                              <strong>Livrare Solicitata la:</strong>{' '}
                              {/* Am schimbat label-ul */}
                              {format(
                                new Date(delivery.requestedDeliveryDate), // Folosim requestedDeliveryDate
                                'PPP',
                                { locale: ro },
                              )}
                              {delivery.requestedDeliverySlots && ( // Verificăm și afișăm requestedDeliverySlot
                                <>
                                  <br />
                                  <strong>Interval:</strong>{' '}
                                  {delivery.requestedDeliverySlots.join(', ')}
                                </>
                              )}
                            </div>
                          )}
                          {delivery.deliveryNotes && (
                            <div>
                              <strong>Note Livrare:</strong>{' '}
                              <i className='text-muted-foreground'>
                                {' '}
                                {delivery.deliveryNotes}
                              </i>
                            </div>
                          )}
                          {delivery.uitCode && (
                            <div>
                              <strong>Cod UIT:</strong> {delivery.uitCode}
                            </div>
                          )}
                          <ul className='list-disc pl-5 text-muted-foreground'>
                            {delivery.items.map((item: IDeliveryLineItem) => (
                              <li key={item._id.toString()}>
                                {item.quantity} {item.unitOfMeasure}
                                {' - '}
                                {item.productName}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className='mt-auto pt-2 border-t'>
                          <div className='flex justify-between font-semibold'>
                            <span>Total Livrare</span>
                            <span>
                              {formatCurrency(delivery.totals.grandTotal)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {/* --- SFÂRȘIT BLOC ÎNLOCUIT --- */}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog
        open={isProformaModalOpen}
        onOpenChange={setIsProformaModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generează Factură Proformă</AlertDialogTitle>
            <AlertDialogDescription>
              Vei genera o Factură Proformă, care este o fotografie a comenzii
              la momentul actual. Acest document <strong>NU</strong> are impact
              fiscal și <strong>NU</strong> mișcă stocul. <br />
              <br />
              Dacă vei modifica ulterior comanda, vei putea genera o nouă
              proformă. <br />
              <br />
              Alege seria de documente de mai jos:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-4'>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger>
                <SelectValue placeholder='Alege o serie...' />
              </SelectTrigger>
              <SelectContent>
                {proformaSeries.map((serie) => (
                  <SelectItem key={serie._id} value={serie.name}>
                    {serie.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleGenerateProforma(selectedSeries)}
              disabled={isGenerating || !selectedSeries}
            >
              {isGenerating ? 'Se generează...' : 'Generează'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </div>
  )
}
