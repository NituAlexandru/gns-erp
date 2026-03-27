import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getClientPayments } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { PublicReceivablesListWrapper } from './PublicReceivablesListWrapper'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import { ClientPaymentDTO } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { ReceivablesFilterBar } from '@/app/admin/management/incasari-si-plati/receivables/components/ReceivablesFilterBar'

type PopulatedClientPayment = ClientPaymentDTO & {
  clientId: {
    _id: string
    name: string
  }
}

export default async function PublicIncasariPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    from?: string
    to?: string
    method?: string
  }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const params = await searchParams
  const page = Number(params.page) || 1

  // 1. Aducem datele folosind paginația corectă
  // 2. Transmitem hideCompensations: 'true' pentru a exclude compensările DOAR pe această rută!
  const paymentsResult = await getClientPayments(page, RECEIVABLES_PAGE_SIZE, {
    search: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
    method: params.method,
    hideCompensations: 'true',
  })

  const safeData = (
    paymentsResult.success
      ? paymentsResult
      : { data: [], pagination: { total: 0, page: 1, totalPages: 0 } }
  ) as {
    data: PopulatedClientPayment[]
    pagination: { total: number; page: number; totalPages: number }
  }

  return (
    <div className='space-y-4 p-0'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Încasări Clienți</h2>
          <p className='text-muted-foreground'>
            Vizualizarea tuturor încasărilor înregistrate în sistem.
          </p>
        </div>
        <ReceivablesFilterBar />
      </div>

      <PublicReceivablesListWrapper data={safeData} isAdmin={false} />
    </div>
  )
}
