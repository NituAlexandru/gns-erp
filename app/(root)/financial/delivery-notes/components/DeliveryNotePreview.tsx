'use client'

import Link from 'next/link'
import { Eye, ExternalLink, FileCheck, Truck, Package } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { DeliveryNoteStatusBadge } from './DeliveryNoteStatusBadge'
import { DeliveryNoteInfoCards } from './details/DeliveryNoteInfoCards'
import { DeliveryNoteSummary } from './details/DeliveryNoteSummary'
import { DeliveryNoteItemsTable } from './details/DeliveryNoteItemsTable'

interface DeliveryNotePreviewProps {
  note: DeliveryNoteDTO
}

export function DeliveryNotePreview({ note }: DeliveryNotePreviewProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8 hover:bg-muted'>
          <Eye className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors' />
          <span className='sr-only'>Previzualizare Aviz</span>
        </Button>
      </HoverCardTrigger>

      <HoverCardContent
        side='left'
        align='start'
        sideOffset={10}
        collisionPadding={100}
        className='w-[1200px] p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-slate-800 
                   data-[state=open]:animate-in data-[state=closed]:animate-out 
                   data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
                   data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
                   data-[side=left]:slide-in-from-right-4 
                   duration-300 ease-in-out'
      >
        <div className='max-h-[85vh] overflow-y-auto bg-card dark:bg-card/50'>
          <div className='p-4 space-y-4'>
            {/* 1. HEADER PREVIEW (MODIFICAT) */}
            <div className='flex justify-between items-start'>
              <div>
                <h1 className='text-xl font-bold flex items-center gap-2'>
                  Aviz {note.seriesName} - {note.noteNumber}
                </h1>
                <p className='text-sm text-muted-foreground'>
                  Data: {new Date(note.createdAt).toLocaleDateString('ro-RO')}
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <DeliveryNoteStatusBadge status={note.status} />

                {/* Separator */}
                <div className='h-6 w-px bg-border mx-1' />

                {/* Link Comandă */}
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 px-2 text-xs gap-1.5'
                  asChild
                  title='Vezi Comanda'
                >
                  <Link href={`/orders/${note.orderId}`}>
                    <Package className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>Comandă</span>
                  </Link>
                </Button>

                {/* Link Livrare */}
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 px-2 text-xs gap-1.5'
                  asChild
                  title='Vezi Livrarea'
                >
                  <Link href={`/deliveries/new?orderId=${note.orderId}`}>
                    <Truck className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>Livrare</span>
                  </Link>
                </Button>

                {/* Link Factură (dacă există) */}
                {note.isInvoiced && note.relatedInvoices?.[0] && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 px-2 text-xs gap-1.5 '
                    asChild
                    title='Vezi Factura'
                  >
                    <Link
                      href={`/financial/invoices/${note.relatedInvoices[0].invoiceId}`}
                    >
                      <FileCheck className='h-3.5 w-3.5' />
                      <span>Factură</span>
                    </Link>
                  </Button>
                )}

                {/* Link Detalii Aviz (External) */}
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 px-2 text-xs gap-1.5  '
                  asChild
                  title='Deschide Pagina Avizului'
                >
                  <Link href={`/financial/delivery-notes/${note._id}`}>
                    <ExternalLink className='h-3.5 w-3.5' />
                    <span>Detalii Aviz</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* 2. REUTILIZARE COMPONENTE DETALII */}
            <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
              <div className='xl:col-span-2 space-y-2'>
                <DeliveryNoteInfoCards note={note} isPreview={true} />
              </div>

              {/* Dreapta: Sumar & Note */}
              <div className='xl:col-span-1'>
                <DeliveryNoteSummary note={note} />
              </div>

              {/* Jos: Tabel Produse */}
              <div className='xl:col-span-3'>
                <DeliveryNoteItemsTable items={note.items} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
