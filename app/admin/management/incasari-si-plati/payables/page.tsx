import { getAllSuppliersForAdmin } from '@/lib/db/modules/suppliers/supplier.actions'
import { getSupplierInvoices } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { getSupplierPayments } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import {
  getVatRates,
  getDefaultVatRate,
} from '@/lib/db/modules/setting/vat-rate/vatRate.actions'
import { getBudgetCategories } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'
import { PayablesPageContent } from './components/PayablesPageContent'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import {
  getAnafInboxErrors,
  getAnafLogs,
} from '@/lib/db/modules/setting/efactura/anaf.actions'
import { PAGE_SIZE } from '@/lib/constants'
import { connectToDatabase } from '@/lib/db'

export default async function PayablesPage() {
  await connectToDatabase()

  const [
    suppliersResult,
    invoicesResult,
    paymentsResult,
    vatRatesData,
    defaultVatData,
    budgetCategoriesData,
    inboxErrorsResult,
    logsResult,
  ] = await Promise.all([
    getAllSuppliersForAdmin({ limit: 1000 }),
    getSupplierInvoices(1, PAGE_SIZE),
    getSupplierPayments(1, PAGE_SIZE),
    getVatRates(),
    getDefaultVatRate(),
    getBudgetCategories(),
    getAnafInboxErrors(1, PAGE_SIZE),
    getAnafLogs(1, PAGE_SIZE),
  ])

  const budgetCategoriesTree: IBudgetCategoryTree[] = []

  return (
    <PayablesPageContent
      suppliers={suppliersResult.data || []}
      invoicesData={invoicesResult}
      paymentsData={paymentsResult}
      inboxData={inboxErrorsResult}
      logsData={logsResult}
      vatRates={vatRatesData.data || []}
      defaultVatRate={defaultVatData.data || null}
      budgetCategoriesFlat={budgetCategoriesData.data || []}
      budgetCategoriesTree={budgetCategoriesTree}
    />
  )
}
