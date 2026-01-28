import { getSupplierInvoices } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { getAllSuppliersForAdmin } from '@/lib/db/modules/suppliers/supplier.actions'
import { getBudgetCategories } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'
import { SupplierInvoiceListWrapper } from './SupplierInvoiceListWrapper'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { PayablesSummaryCard } from '../components/PayablesSummaryCard'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import { auth } from '@/auth'

function buildBudgetTree(flatCats: any[]): IBudgetCategoryTree[] {
  if (!flatCats || flatCats.length === 0) return []

  const map = new Map<string, IBudgetCategoryTree>()
  const tree: IBudgetCategoryTree[] = []

  // 1. Inițializăm harta
  flatCats.forEach((cat) => {
    map.set(cat._id.toString(), {
      ...cat,
      children: [],
      isActive: true, // Asigurăm proprietățile necesare
    } as IBudgetCategoryTree)
  })

  // 2. Construim arborele
  map.forEach((cat) => {
    if (cat.parentId) {
      const parent = map.get(cat.parentId.toString())
      if (parent) {
        parent.children.push(cat)
      }
    } else {
      tree.push(cat)
    }
  })

  return tree
}

export default async function InvoicesPage({
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
  const session = await auth()
  const params = await searchParams
  const page = Number(params.page) || 1

  const [invoicesData, suppliersRes, budgetsRes] = await Promise.all([
    getSupplierInvoices(page, PAYABLES_PAGE_SIZE, {
      q: params.q,
      status: params.status,
      from: params.from,
      to: params.to,
    }),
    getAllSuppliersForAdmin({ limit: 1000 }),
    getBudgetCategories(),
  ])

  const flatCategories = budgetsRes.success ? budgetsRes.data : []
  const budgetTree = buildBudgetTree(flatCategories)

  return (
    <div className='flex flex-col h-full space-y-1'>
      {/* Cardul de Sumar Sus */}
      <PayablesSummaryCard
        label='Total Facturi Filtrate'
        amount={invoicesData.summaryTotal || 0}
        type='invoice'
      />

      {/* Tabelul jos */}
      <div className='flex-1 min-h-0'>
        <SupplierInvoiceListWrapper
          initialData={invoicesData}
          suppliers={suppliersRes.data}
          budgetCategories={budgetTree}
          currentUser={
            session?.user?.id
              ? { id: session.user.id, name: session.user.name }
              : undefined
          }
        />
      </div>
    </div>
  )
}
