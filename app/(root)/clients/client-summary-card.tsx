'use client'

import { useState } from 'react'
import { IClientSummary } from '@/lib/db/modules/client/summary/client-summary.model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Edit2, Lock, Printer, Unlock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { SetCreditLimitModal } from './[id]/[slug]/SetCreditLimitModal'
import { LOCKING_STATUS } from '@/lib/db/modules/client/summary/client-summary.constants'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { getPrintData } from '@/lib/db/modules/printing/printing.actions'
import { toast } from 'sonner'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface ClientSummaryCardProps {
  summary: IClientSummary
  clientId: string
  clientSlug: string
  isAdmin: boolean
}

export default function ClientSummaryCard({
  summary,
  clientId,
  clientSlug,
  isAdmin,
}: ClientSummaryCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [pdfData, setPdfData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  // --- Logica pentru Cardul 1 (Sold) ---
  const isOverdue = summary.outstandingBalance > 0
  const soldTitle = isOverdue ? 'Sold Restant' : 'Sold Curent (Avans)'
  const soldColor = isOverdue ? 'text-red-600' : 'text-green-600'
  const soldSubtitle = isOverdue
    ? `Scadent depășit: ${formatCurrency(summary.overdueBalance)}`
    : `Credit disponibil ca avans`

  // --- Logica Card 3 (Status) ---
  let statusTitle = summary.isBlocked ? 'Blocat' : 'Activ'
  let statusColor = summary.isBlocked ? 'text-red-600' : 'text-green-600'
  let statusIcon = summary.isBlocked ? (
    <Lock className='h-4 w-4 inline mr-1' />
  ) : (
    <Unlock className='h-4 w-4 inline mr-1' />
  )
  let statusSubtitle = summary.isBlocked ? 'Livrare oprită' : 'Livrare activă'

  // LOGICA NOUĂ: Suprascriere pentru Status Manual + Motiv
  if (summary.lockingStatus === LOCKING_STATUS.MANUAL_BLOCK) {
    statusTitle = 'Blocat (Setat Manual)'
    statusColor = 'text-red-600'
    statusSubtitle = summary.lockingReason
      ? `Motiv: ${summary.lockingReason}`
      : 'Fără motiv specificat'
  } else if (summary.lockingStatus === LOCKING_STATUS.MANUAL_UNBLOCK) {
    statusTitle = 'Activ (Setat Manual)'
    statusColor = 'text-amber-600'
    statusIcon = <AlertTriangle className='h-4 w-4 inline mr-1' />
    statusSubtitle = summary.lockingReason
      ? `Motiv: ${summary.lockingReason}`
      : 'Excepție manuală'
  }

  const handlePrintLedger = async () => {
    setIsGeneratingPdf(true)
    setIsPdfOpen(true) // Deschidem modalul imediat cu loading state

    try {
      const result = await getPrintData(clientId, 'CLIENT_LEDGER' as any) // Cast as any temporar pana se actualizeaza tipurile in tot proiectul sau modifica tipul in functie
      if (result.success) {
        setPdfData(result.data)
      } else {
        toast.error('Eroare', { description: result.message })
        setIsPdfOpen(false)
      }
    } catch (e) {
      toast.error('Eroare server la generarea PDF')
      setIsPdfOpen(false)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <>
      <PdfPreviewModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        data={pdfData}
        isLoading={isGeneratingPdf}
      />
      <div className='p-2 rounded-lg border'>
        <h2 className='text-lg font-semibold mb-2'>Sumar Financiar</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 w-full'>
          {/* 1. Sold Curent / Restant (Modificat) */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
              <CardTitle className='text-sm font-medium'>{soldTitle}</CardTitle>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 text-muted-foreground hover:text-foreground'
                onClick={handlePrintLedger}
                title='Printează Fișa Client'
              >
                <Printer className='h-4 w-4' />
              </Button>
            </CardHeader>
            <CardContent>
              {/* Soldul Operațional (Mare) */}
              <div className={`text-2xl font-bold ${soldColor}`}>
                {formatCurrency(summary.outstandingBalance)}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {soldSubtitle}
              </p>
            </CardContent>
          </Card>

          {/* 2. Facturi Restante (NOU) */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>
                Facturi Restante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {summary.overdueInvoicesCount}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Facturi care au depășit scadența
              </p>
            </CardContent>
          </Card>

          {/* 3. Status Client (Refactorizat) */}
          <Card
            className={
              summary.lockingStatus !== LOCKING_STATUS.AUTO
                ? 'border-amber-200 bg-amber-50/10'
                : ''
            }
          >
            <CardHeader>
              <CardTitle className='text-sm font-medium'>
                Status Livrare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${statusColor} flex items-center`}
              >
                {statusIcon} {statusTitle}
              </div>
              <p
                className='text-xs font-medium text-muted-foreground mt-1 line-clamp-3'
                title={statusSubtitle}
              >
                {statusSubtitle}
              </p>
            </CardContent>
          </Card>

          {/* 4. Plafon Credit (Modificat cu Buton Admin) */}
          <Card>
            <CardHeader>
              <div className='flex justify-between items-center p-0 mt-[-10px]'>
                <CardTitle className='text-sm font-medium'>
                  Plafon Credit
                </CardTitle>
                {isAdmin && (
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Edit2 className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatCurrency(summary.creditLimit)}
              </div>
              <p className='text-xs text-muted-foreground'>
                Disponibil: {formatCurrency(summary.availableCredit)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal-ul (rendat doar de admini) */}
      {isAdmin && (
        <SetCreditLimitModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          clientId={clientId}
          clientSlug={clientSlug}
          currentLimit={summary.creditLimit}
          currentStatus={summary.lockingStatus}
          currentReason={summary.lockingReason}
        />
      )}
    </>
  )
}
