import { getAllUnpaidInvoices } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import { ReceivablesSummaryCard } from '../components/ReceivablesSummaryCard'
import { ClientInvoicesWrapper } from '../components/ClientInvoicesWrapper'
import { auth } from '@/auth'

export default async function InvoicesTab({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    from?: string
    to?: string
    dateType?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const session = await auth()
  const currentUser = session?.user
    ? { id: session.user.id || '', name: session.user.name }
    : { id: '' }

  const invoicesData = await getAllUnpaidInvoices(page, RECEIVABLES_PAGE_SIZE, {
    search: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
    dateType: params.dateType,
  })

  return (
    <div className='flex flex-col h-full space-y-1'>
      <ReceivablesSummaryCard
        label='Total Facturi Neîncasate'
        amount={invoicesData.summaryTotal || 0}
        type='invoice'
      />

      <div className='flex-1 min-h-0'>
        <ClientInvoicesWrapper
          initialData={invoicesData}
          currentUser={currentUser}
        />
      </div>
    </div>
  )
}
