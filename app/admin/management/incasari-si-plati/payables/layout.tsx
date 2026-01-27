import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/db'
import { getAllSuppliersForAdmin } from '@/lib/db/modules/suppliers/supplier.actions'
import {
  getVatRates,
  getDefaultVatRate,
} from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { getBudgetCategories } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'
// Importăm acțiunile DOAR pentru count-uri (le vom optimiza să aducă doar count)
import { getSupplierInvoices } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { getSupplierPayments } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import {
  getAnafInboxErrors,
  getAnafLogs,
} from '@/lib/db/modules/setting/efactura/anaf.actions'
import { PayablesLayoutClient } from './components/PayablesLayoutClient'

export default async function PayablesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())
  const isManager = userRole.toLowerCase() === 'manager'

  if (!isAdmin && !isManager) {
    redirect('/')
  }

  await connectToDatabase()

  // 1. Încărcăm datele necesare pentru MODALE și HEADER (Badge-uri)
  // Nota: Aici incarcam doar prima pagina pentru a lua TOTAL-ul pentru badge-uri.
  // Continutul real al tabelelor se va incarca in page.tsx-ul specific.
  const [
    suppliersResult,
    vatRatesData,
    defaultVatData,
    budgetCategoriesData,
    invoicesRes,
    paymentsRes,
    inboxRes,
    logsRes,
  ] = await Promise.all([
    getAllSuppliersForAdmin({ limit: 1000 }),
    getVatRates(),
    getDefaultVatRate(),
    getBudgetCategories(),
    // Fetch-uri minime doar pentru count-urile din badge-uri (anul curent)
    getSupplierInvoices(1, 1),
    getSupplierPayments(1, 1),
    getAnafInboxErrors(1, 1),
    getAnafLogs(1, 1),
  ])

  const counts = {
    invoices: invoicesRes.totalCurrentYear || 0,
    payments: paymentsRes.totalCurrentYear || 0,
    inbox: inboxRes.totalCurrentYear || 0,
    logs: logsRes.totalCurrentYear || 0,
  }

  return (
    <PayablesLayoutClient
      suppliers={suppliersResult.data || []}
      vatRates={vatRatesData.data || []}
      defaultVatRate={defaultVatData.data || null}
      budgetCategoriesFlat={budgetCategoriesData.data || []}
      counts={counts}
    >
      {children}
    </PayablesLayoutClient>
  )
}
