import { getClientBalances } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { ReceivablesSummaryCard } from '../components/ReceivablesSummaryCard'
import { ClientBalancesList } from '../components/ClientBalancesList'

export default async function ClientBalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''

  // 1. Fetch Date
  const balances = await getClientBalances(query)

  // 2. Calcul Total
  const totalReceivable = balances.reduce(
    (acc, curr) => acc + curr.totalBalance,
    0,
  )

  return (
    <div className='flex flex-col h-full space-y-1'>
      <ReceivablesSummaryCard
        label={`Sold Total Clienți ${query ? '(Filtrat)' : ''}`}
        amount={totalReceivable}
        type='invoice'
      />

      {/* Lista */}
      <div className='flex-1 min-h-0 overflow-hidden'>
        <ClientBalancesList data={balances} />
      </div>
    </div>
  )
}
