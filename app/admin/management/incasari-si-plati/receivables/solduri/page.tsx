import { getClientBalances } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { ReceivablesSummaryCard } from '../components/ReceivablesSummaryCard'
import { ClientBalancesList } from '../components/ClientBalancesList'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

export default async function ClientBalancesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    balanceType?: string
    minAmt?: string
    maxAmt?: string
    overdueDays?: string
  }>
}) {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole)

  const params = await searchParams
  const query = params.q || ''

  const filters = {
    balanceType: params.balanceType,
    minAmt: params.minAmt,
    maxAmt: params.maxAmt,
    overdueDays: params.overdueDays,
  }

  const { data: balances, summary } = await getClientBalances(query, filters)

  return (
    <div className='flex flex-col h-full space-y-1'>
      <div className='flex flex-wrap items-center gap-5 sm:gap-4'>
        <ReceivablesSummaryCard
          label={`Clienți în listă ${query ? '(Filtrat)' : ''}`}
          amount={balances.length}
          type='neutral'
          isCurrency={false}
        />
        <ReceivablesSummaryCard
          label={`Sold Total ${query ? '(Filtrat)' : ''}`}
          amount={Math.abs(summary.totalNetBalance)}
          type={summary.totalNetBalance > 0 ? 'invoice' : 'receipt'}
        />
        <ReceivablesSummaryCard
          label={`Facturi Totale Neachitate ${query ? '(Filtrat)' : ''}`}
          amount={summary.totalUnpaidInvoices}
          type='invoice'
        />
        <ReceivablesSummaryCard
          label={`Avans Total Clienți ${query ? '(Filtrat)' : ''}`}
          amount={summary.totalUnallocatedAdvances}
          type='receipt'
        />
      </div>

      {/* Lista */}
      <div className='flex-1 min-h-0 overflow-hidden'>
        <ClientBalancesList
          data={balances}
          isAdmin={isAdmin}
          currentUser={
            session?.user?.id
              ? { id: session.user.id, name: session.user.name || '' }
              : undefined
          }
        />
      </div>
    </div>
  )
}
