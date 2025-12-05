'use client'

import { useState } from 'react'
import { IClientSummary } from '@/lib/db/modules/client/summary/client-summary.model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { SetCreditLimitModal } from './[id]/[slug]/SetCreditLimitModal'

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

  // --- Logica pentru Cardul 1 (Sold) ---
  const isOverdue = summary.outstandingBalance > 0
  const soldTitle = isOverdue ? 'Sold Restant' : 'Sold Curent (Avans)'
  const soldColor = isOverdue ? 'text-red-600' : 'text-green-600'
  const soldSubtitle = isOverdue
    ? `Scadent depășit: ${formatCurrency(summary.overdueBalance)}`
    : `Credit disponibil ca avans`

  // --- Logica pentru Cardul 3 (Status) ---
  const statusTitle = summary.isBlocked ? 'Blocat' : 'Activ'
  const statusColor = summary.isBlocked ? 'text-red-500' : 'text-green-600'

  return (
    <>
      <div className='p-2 rounded-lg border'>
        <h2 className='text-lg font-semibold mb-2'>Sumar Financiar</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 w-full'>
          {/* 1. Sold Curent / Restant (Modificat) */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>{soldTitle}</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle className='text-sm font-medium'>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statusColor}`}>
                {statusTitle}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {summary.isBlocked ? 'Livrare oprită' : 'Livrare activă'}
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
        />
      )}
    </>
  )
}
