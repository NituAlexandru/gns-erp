import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { getClientBalances } from '@/lib/db/modules/financial/invoices/invoice.actions'
// Ajustează calea către componenta ta de listă
import { ClientBalancesList } from '@/app/admin/management/incasari-si-plati/receivables/components/ClientBalancesList'
import { ReceivablesFilterBar } from '@/app/admin/management/incasari-si-plati/receivables/components/ReceivablesFilterBar'
// Ajustează calea către componenta ta de filtru
// import { ReceivablesFilters } from '@/components/filtre/ReceivablesFilters'

export default async function PublicBalancesPage({
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

  // Verificăm rolul exact folosind constanta ta de securitate
  const userRole = session?.user?.role || 'user'
  const hasAdminRights = SUPER_ADMIN_ROLES.includes(userRole)

  const params = await searchParams
  const query = params.q || ''
  const filters = {
    balanceType: params.balanceType,
    minAmt: params.minAmt,
    maxAmt: params.maxAmt,
    overdueDays: params.overdueDays,
  }

  // Aducem doar datele, ignorăm summary-ul pentru această pagină
  const { data: balances } = await getClientBalances(query, filters)

  return (
    <div className='flex flex-col h-full space-y-1'>
      <div className='flex justify-between gap-1'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Solduri Clienți</h1>
          <p className='text-sm text-muted-foreground'>
            Situația financiară și istoricul facturilor.
          </p>
        </div>
        <ReceivablesFilterBar />
      </div>

      {/* Lista de solduri */}
      <div className='flex-1 min-h-0 overflow-hidden bg-background rounded-md border shadow-sm'>
        <ClientBalancesList
          data={balances}
          isAdmin={hasAdminRights}
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
