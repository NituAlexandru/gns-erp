
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import {
  getStaticTreasuryStats,
  getOverdueClientsSummary,
} from '@/lib/db/modules/financial/treasury/summary/summary.actions'
import { TreasuryDashboardContent } from './components/TreasuryDashboardContent'
import {
  TreasuryStaticStats,
  OverdueClientSummary,
} from '@/lib/db/modules/financial/treasury/summary/summary.types'

export default async function TreasuryDashboardPage() {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  const [staticStats, overdueClients] = await Promise.all([
    getStaticTreasuryStats(),
    getOverdueClientsSummary(),
  ])

  return (
    <TreasuryDashboardContent
      isAdmin={isAdmin}
      initialStaticStats={staticStats as TreasuryStaticStats}
      initialOverdueClients={overdueClients as OverdueClientSummary[]}
    />
  )
}
