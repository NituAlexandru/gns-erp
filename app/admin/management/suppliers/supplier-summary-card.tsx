'use client'

import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Wallet, AlertCircle, FileText, TrendingUp } from 'lucide-react'

interface SupplierSummaryCardProps {
  summary: ISupplierSummary
}

export default function SupplierSummaryCard({
  summary,
}: SupplierSummaryCardProps) {
  // --- 1. LOGICA SOLD ---
  // paymentBalance s-a redenumit în outstandingBalance
  const balance = summary.outstandingBalance
  const isDebt = balance > 0

  // Dacă e > 0 (Datorie) = Roșu. Dacă e < 0 (Avans dat) = Verde.
  const soldTitle = isDebt ? 'Sold Datorat' : 'Sold Creditor (Avans)'
  const soldColor = isDebt ? 'text-red-600' : 'text-green-600'
  const soldSubtitle = isDebt
    ? 'Total de plată către furnizor'
    : 'Bani disponibili la furnizor'

  // --- 2. LOGICA OVERDUE ---
  // overduePaymentBalance s-a redenumit în overdueBalance
  const overdueVal = summary.overdueBalance
  const overdueCount = summary.overdueInvoicesCount || 0
  const hasOverdue = overdueVal > 0

  return (
    <div className='p-2 rounded-lg border'>
      <h2 className='text-lg font-semibold mb-2 flex items-center gap-2'>
        Sumar Financiar
      </h2>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 w-full'>
        {/* CARD 1: SOLD CURENT */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{soldTitle}</CardTitle>
            <Wallet className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${soldColor}`}>
              {formatCurrency(balance)}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>{soldSubtitle}</p>
          </CardContent>
        </Card>

        {/* CARD 2: SOLD SCADENT (VALOARE) */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Sold Scadent</CardTitle>
            <AlertCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                hasOverdue ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {formatCurrency(overdueVal)}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Depășit la plată
            </p>
          </CardContent>
        </Card>

        {/* CARD 3: FACTURI RESTANTE (NUMĂR) - NOU */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Facturi Restante
            </CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold '>{overdueCount}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              Doc. neplătite la termen
            </p>
          </CardContent>
        </Card>

        {/* CARD 4: TOTAL ACHIZIȚII */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Achiziții
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(summary.totalPurchaseValue || 0)}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Achizitii Totale
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
