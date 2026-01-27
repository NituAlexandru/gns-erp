import { getSupplierPayments } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { SupplierPaymentListWrapper } from './SupplierPaymentListWrapper'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { PayablesSummaryCard } from '../components/PayablesSummaryCard'

export default async function PaymentsPage({
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

  const paymentsData = await getSupplierPayments(page, PAYABLES_PAGE_SIZE, {
    q: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
  })

  const safeData = {
    ...paymentsData,
    data: paymentsData.data as any[],
  }

  return (
    <div className='flex flex-col h-full space-y-4'>
      {/* Card Sumar */}
      <PayablesSummaryCard
        label='Total Plăți Efectuate'
        amount={paymentsData.summaryTotal || 0}
        type='payment'
      />

      <div className='flex-1 min-h-0'>
        <SupplierPaymentListWrapper initialData={safeData} />
      </div>
    </div>
  )
}
