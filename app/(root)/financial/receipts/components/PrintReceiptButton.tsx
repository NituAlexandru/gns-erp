// components/financial/receipts/PrintReceiptButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { toast } from 'sonner'

export function PrintReceiptButton({ receiptId }: { receiptId: string }) {
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handlePrint = async () => {
    setIsGenerating(true)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(receiptId, 'RECEIPT')

      if (result.success) {
        setPrintData(result.data)
        setIsOpen(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor pentru printare.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button onClick={handlePrint} disabled={isGenerating}>
        {isGenerating ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <Printer className='mr-2 h-4 w-4' />
        )}
        Printează
      </Button>

      <PdfPreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        data={printData}
        isLoading={isGenerating}
      />
    </>
  )
}
