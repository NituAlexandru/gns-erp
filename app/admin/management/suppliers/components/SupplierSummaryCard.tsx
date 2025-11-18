'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'

interface SupplierSummaryCardProps {
  summary: ISupplierSummary
}

export default function SupplierSummaryCard({
  summary,
}: SupplierSummaryCardProps) {
  // Logica: paymentBalance > 0 înseamnă că datorăm bani (Rău/Roșu de obicei, sau neutru)
  // paymentBalance < 0 înseamnă că am plătit în avans (Verde)

  const debt = summary.paymentBalance
  const isDebt = debt > 0

  const soldTitle = isDebt ? 'Sold Datorat' : 'Sold Creditor (Avans)'
  const soldColor = isDebt ? 'text-red-600' : 'text-green-600'

  const overdue = summary.overduePaymentBalance
  const hasOverdue = overdue > 0

  return (
    <div className='p-4 rounded-lg border border-gray-200'>
      <h2 className='text-lg font-semibold mb-4'>Sumar Financiar Furnizor</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
        {/* 1. Sold Curent */}
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>{soldTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${soldColor}`}>
              {formatCurrency(debt)}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {isDebt ? 'Total de plată către furnizor' : 'Am plătit în plus'}
            </p>
          </CardContent>
        </Card>

        {/* 2. Scadent Depășit */}
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>Sold Scadent</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${hasOverdue ? 'text-red-600' : 'text-gray-900'}`}
            >
              {formatCurrency(overdue)}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Facturi cu termen depășit
            </p>
          </CardContent>
        </Card>

        {/* 3. Total Achiziții (Informativ) */}
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>
              Total Achiziții
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {formatCurrency(summary.totalPurchaseValue)}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Valoarea istorică a comenzilor
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
