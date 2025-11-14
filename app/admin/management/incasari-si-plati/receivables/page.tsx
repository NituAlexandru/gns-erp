
import { auth } from '@/auth'
import { getClientPayments } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { ClientPaymentDTO } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { ReceivablesPageContent } from './components/ReceivablesPageContent'

// Tipul pentru o încasare populată (necesar pentru a o trimite la client)
type PopulatedClientPayment = ClientPaymentDTO & {
  clientId: {
    _id: string
    name: string
  }
}

export default async function ReceivablesPage() {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  // 1. Preluăm DOAR încasările
  const paymentsResult = await getClientPayments()

  // 2. Trimitem datele la componenta Client
  return (
    <ReceivablesPageContent
      isAdmin={isAdmin}
      payments={(paymentsResult.data as PopulatedClientPayment[]) || []}
    />
  )
}
