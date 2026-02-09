'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Eye,
  Truck,
  Printer,
  MapPin,
  User,
  FilePenLine,
  Pencil,
  Package,
  FileText,
  Loader2,
  FileCheck,
} from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { format } from 'date-fns'
import { toast } from 'sonner' // Pentru erori la print
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface DeliveryPreviewProps {
  delivery: IDelivery
}

export function DeliveryPreview({ delivery }: DeliveryPreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
    name: 'Necunoscut',
    variant: 'secondary',
  }

  // Condiții de afișare
  const canEdit = ['CREATED', 'SCHEDULED', 'IN_TRANSIT'].includes(
    delivery.status,
  )
  const hasAviz = !!delivery.deliveryNoteId

  // Helper adresă
  const addressParts = [
    delivery.deliveryAddress.strada,
    delivery.deliveryAddress.numar
      ? `nr. ${delivery.deliveryAddress.numar}`
      : null,
    delivery.deliveryAddress.localitate,
    delivery.deliveryAddress.judet,
  ]
    .filter(Boolean)
    .join(', ')

  // --- HANDLER PRINT ---
  const handlePrintPreview = async () => {
    if (!delivery.deliveryNoteId) return
    setIsGeneratingPdf(true)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(
        delivery.deliveryNoteId.toString(),
        'DELIVERY_NOTE',
      )
      if (result.success) {
        setPrintData(result.data)
        setIsPreviewOpen(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generare PDF.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Button variant='ghost' size='icon' className='h-8 w-8 '>
            <Eye className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors' />
            <span className='sr-only'>Previzualizare</span>
          </Button>
        </HoverCardTrigger>

        <HoverCardContent
          side='left'
          align='start'
          sideOffset={10}
          collisionPadding={200}
          className='w-[750px] bg-card p-0 overflow-hidden shadow-2xl border-border '
        >
          <div className='max-h-[85vh] overflow-y-auto'>
            <div className='p-4 pb-2 flex justify-between items-start'>
              <div className='space-y-1 font-mono text-sm'>
                <div className='flex items-center gap-2'>
                  <span className='text-red-500 font-bold'>Comanda:</span>
                  <span className='text-red-500 font-bold tracking-wide text-lg'>
                    {delivery.orderNumber}
                  </span>
                </div>
                <div className='flex items-center gap-2 '>
                  <span>Livr:</span>
                  <span>{delivery.deliveryNumber}</span>
                </div>
                {delivery.deliveryNoteNumber && (
                  <div className='flex items-center gap-2  font-bold'>
                    <span>Aviz:</span>
                    <span>{delivery.deliveryNoteNumber}</span>
                  </div>
                )}
              </div>

              <Badge
                variant={statusInfo.variant}
                className='text-xs px-2 py-0.5 h-6'
              >
                {statusInfo.name}
              </Badge>
            </div>

            <Separator className='' />

            {/* 2. CLIENT INFO */}
            <div className='p-4 py-3 space-y-2 text-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 font-semibold'>
                  <User className='h-4 w-4 ' />
                  <span className='uppercase tracking-wide'>
                    {delivery.clientSnapshot.name}
                  </span>
                </div>
                <div className=' font-mono text-xs  px-2 py-0.5 rounded border '>
                  CUI: {delivery.clientSnapshot.cui}
                </div>
              </div>
              <div className='flex items-start gap-2  text-xs pl-0.5'>
                <MapPin className='h-3.5 w-3.5 mt-0.5 flex-shrink-0' />
                <span>{addressParts}</span>
              </div>
            </div>

            <Separator className='' />

            {/* 3. LOGISTICĂ (Șofer & Interval) */}
            <div className='p-4 py-3 space-y-2 text-sm'>
              <div className='flex items-center gap-2 '>
                <Truck className='h-4 w-4 flex-shrink-0' />
                <span>
                  Sofer:{' '}
                  <span className=' font-medium'>
                    {delivery.driverName || 'N/A'}
                  </span>
                </span>
                <span className='text-zinc-700'>|</span>
                <span>
                  Auto:{' '}
                  <span className=' font-medium'>
                    {delivery.vehicleNumber || 'N/A'}
                  </span>
                </span>
              </div>

              {delivery.deliveryDate && (
                <div className='pl-6 pt-1'>
                  <span className=''>Programat: </span>
                  <span className='font-bold '>
                    {delivery.deliverySlots?.join(', ') ||
                      'Interval nespecificat'}
                  </span>
                </div>
              )}
            </div>

            <Separator className='' />

            {/* 4. TABEL ARTICOLE */}
            <div className='p-4 py-3'>
              <h4 className='text-xs font-semibold uppercase mb-2'>
                Articole în livrare:
              </h4>
              <div className='border  rounded-md overflow-hidden '>
                <Table>
                  <TableBody>
                    {delivery.items.map((item: IDeliveryLineItem) => (
                      <TableRow key={item._id.toString()} className='text-xs '>
                        <TableCell className='py-1.5 font-medium '>
                          {item.productName}
                        </TableCell>
                        <TableCell className='py-1.5 text-right whitespace-nowrap  font-mono'>
                          {item.quantity} {item.unitOfMeasure}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />
            {/* 5. METADATA FOOTER */}
            <div className='px-4 pt-4 pb-4 text-xs space-y-0.5 italic'>
              <p>
                Creată de {delivery.createdByName} la{' '}
                {format(new Date(delivery.createdAt), 'dd.MM.yyyy, HH:mm')}
              </p>
              {delivery.lastUpdatedByName && (
                <p>
                  Programată de {delivery.lastUpdatedByName} la{' '}
                  {format(new Date(delivery.updatedAt), 'dd.MM.yyyy, HH:mm')}
                </p>
              )}
            </div>

            {/* 6. BUTOANE DE ACȚIUNE - ONE ROW FLEX */}
            <div className='p-3'>
              <div className='flex flex-wrap gap-2 items-center'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 px-2 text-xs'
                  asChild
                >
                  <Link href={`/orders/${delivery.orderId.toString()}`}>
                    <Package className='mr-1.5 h-3 w-3' /> Vezi Comanda
                  </Link>
                </Button>

                {/* Modifică Comanda */}
                {canEdit && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 px-2 text-xs'
                    asChild
                  >
                    <Link href={`/orders/${delivery.orderId.toString()}/edit`}>
                      <Pencil className='mr-1.5 h-3 w-3' /> Modifică Comanda
                    </Link>
                  </Button>
                )}

                {/* Modifică Livrarea */}
                {canEdit && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 px-2 text-xs'
                    asChild
                  >
                    <Link
                      href={`/deliveries/new?orderId=${delivery.orderId.toString()}`}
                    >
                      <FilePenLine className='mr-1.5 h-3 w-3' /> Modifică
                      Livrarea
                    </Link>
                  </Button>
                )}

                {/* Vezi Aviz */}
                {hasAviz && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 px-2 text-xs'
                    asChild
                  >
                    <Link
                      href={`/financial/delivery-notes/${delivery.deliveryNoteId}`}
                    >
                      <FileText className='mr-1.5 h-3 w-3' /> Vezi Aviz
                    </Link>
                  </Button>
                )}

                {/* Printează Aviz */}
                {hasAviz && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 px-2      text-xs'
                    onClick={handlePrintPreview}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
                    ) : (
                      <Printer className='mr-1.5 h-3 w-3' />
                    )}
                    Printeaza Aviz
                  </Button>
                )}

                {delivery.relatedInvoices &&
                  delivery.relatedInvoices.length > 0 && (
                    <>
                      {delivery.relatedInvoices.map((inv) => (
                        <Button
                          key={inv.invoiceId.toString()}
                          variant='outline'
                          size='sm'
                          className='h-8 px-2  text-xs'
                          asChild
                        >
                          <Link href={`/financial/invoices/${inv.invoiceId}`}>
                            <FileCheck className='mr-1.5 h-3 w-3 ' />
                            Vezi Factura
                            {delivery.relatedInvoices.length > 1
                              ? `#${inv.invoiceNumber}`
                              : ''}
                          </Link>
                        </Button>
                      ))}
                    </>
                  )}
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Modal Print */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </>
  )
}
