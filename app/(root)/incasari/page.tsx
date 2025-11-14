import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getClientPayments } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { ClientPaymentDTO } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { PublicReceivablesListWrapper } from './PublicReceivablesListWrapper'

type PopulatedClientPayment = ClientPaymentDTO & {
  clientId: {
    _id: string
    name: string
  }
}

export default async function PublicIncasariPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const paymentsResult = await getClientPayments()

  return (
    <div className='space-y-4 p-0'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'> Încasări Clienți</h2>
          <p className='text-muted-foreground'>
            Vizualizarea tuturor încasărilor înregistrate în sistem.
          </p>
        </div>
      </div>

      <PublicReceivablesListWrapper
        payments={(paymentsResult.data as PopulatedClientPayment[]) || []}
        isAdmin={false} // Setăm isAdmin la false
      />
    </div>
  )
}
