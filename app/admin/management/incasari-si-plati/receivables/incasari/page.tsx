import { auth } from '@/auth'
import { getClientPayments } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import { ReceivablesSummaryCard } from '../components/ReceivablesSummaryCard'
import { ReceiptsListWrapper } from '../components/ReceiptsListWrapper'

export default async function ReceiptsTab({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    from?: string
    to?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1

  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  const result = await getClientPayments(page, RECEIVABLES_PAGE_SIZE, {
    search: params.q,
    status: (await searchParams).status,
    from: (await searchParams).from,
    to: (await searchParams).to,
  })

  const safeData = result.success
    ? result
    : {
        data: [],
        summaryTotal: 0,
        pagination: { total: 0, page: 1, totalPages: 0 },
      }

  return (
    <div className='flex flex-col h-full space-y-1'>
      <ReceivablesSummaryCard
        label='Total Încasări Filtrate'
        amount={safeData.summaryTotal || 0}
        type='receipt'
      />

      <div className='flex-1 min-h-0'>
        <ReceiptsListWrapper data={safeData as any} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
