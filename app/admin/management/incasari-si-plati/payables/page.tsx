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

export default async function PayablesPage() {
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
    getSupplierInvoices(),
    getSupplierPayments(),
    getVatRates(),
    getDefaultVatRate(),
    getBudgetCategories(),
    getAnafInboxErrors(),
    getAnafLogs(),
  ])

  const budgetCategoriesTree: IBudgetCategoryTree[] = []

  return (
    <PayablesPageContent
      suppliers={suppliersResult.data || []}
      invoices={invoicesResult.data || []}
      payments={paymentsResult.data || []}
      vatRates={vatRatesData.data || []}
      defaultVatRate={defaultVatData.data || null}
      budgetCategoriesFlat={budgetCategoriesData.data || []}
      budgetCategoriesTree={budgetCategoriesTree}
      inboxErrors={inboxErrorsResult}
      logsData={logsResult}
    />
  )
}
