'use client'

import React from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { InvoiceTemplate } from './templates/InvoiceTemplate'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { Loader2, AlertCircle } from 'lucide-react'
import { DeliveryNoteTemplate } from './templates/DeliveryNoteTemplate'
import { NirTemplate } from './templates/NirTemplate'
import { ReceiptTemplate } from './templates/ReceiptTemplate'

export interface PdfPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  data: PdfDocumentData | null
  isLoading?: boolean
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading,
}) => {
  const getDocumentComponent = () => {
    if (!data) return null
    switch (data.type) {
      case 'INVOICE':
        return <InvoiceTemplate data={data} />
      case 'DELIVERY_NOTE':
        return <DeliveryNoteTemplate data={data} />
      case 'NIR':
        return <NirTemplate data={data} />
      case 'RECEIPT':
        return <ReceiptTemplate data={data} />
      default:
        return null
    }
  }

  const documentComponent = getDocumentComponent()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* MODIFICARE CHEIE AICI:
         1. sm:max-w-[90vw] -> Suprascrie limita default de "sm:max-w-lg" a shadcn.
         2. h-[90vh] -> Ocupă 90% din înălțimea ecranului.
         3. w-full -> Se asigură că se întinde.
      */}
      <DialogContent className='sm:max-w-[90vw] w-full h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0'>
        <DialogHeader className='p-4 border-b bg-white rounded-t-lg z-10'>
          <DialogTitle className='text-primary'>
            Previzualizare Document
          </DialogTitle>
          <DialogDescription className='hidden'>
            Previzualizare PDF
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 bg-slate-100 p-4 overflow-hidden relative flex flex-col items-center justify-center'>
          {isLoading ? (
            <div className='flex flex-col items-center gap-2 text-muted-foreground'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <span className='text-sm'>Se generează PDF-ul...</span>
            </div>
          ) : documentComponent ? (
            <PDFViewer
              width='100%'
              height='100%'
              className='rounded shadow-lg border border-slate-200'
            >
              {documentComponent}
            </PDFViewer>
          ) : (
            <div className='text-center text-muted-foreground flex flex-col items-center gap-2'>
              <AlertCircle className='h-10 w-10 text-slate-300' />
              <p>
                {data
                  ? `Formatul de document "${data.type}" nu are un template definit.`
                  : 'Nu există date pentru previzualizare.'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
