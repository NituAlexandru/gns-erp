import { connectToDatabase } from '@/lib/db'
import { getSupplierBalances } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import Supplier from '@/lib/db/modules/suppliers/supplier.model'
import BudgetCategoryModel from '@/lib/db/modules/financial/treasury/budgeting/budget-category.model'
import { SupplierBalancesList } from '../components/SupplierBalancesList'
import { formatCurrency } from '@/lib/utils'
import { auth } from '@/auth'

export default async function BalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const query = params.q || ''

  const filters = {
    balanceType: params.balanceType,
    minAmt: params.minAmt,
    maxAmt: params.maxAmt,
    overdueDays: params.overdueDays,
    onlyOverdue: params.onlyOverdue === 'true',
    dateType: params.dateType,
    startDate: params.from,
    endDate: params.to,
  }

  const session = await auth()

  await connectToDatabase()

  // Facem fetch la absolut tot direct din Mongoose, în paralel
  const [balancesData, suppliersFlat, budgetCategoriesFlat] = await Promise.all(
    [
      getSupplierBalances(query, filters),
      Supplier.find({}).lean(),
      BudgetCategoryModel.find({}).sort({ name: 1 }).lean(),
    ],
  )

  const { data: balances, summary } = balancesData

  // Construim Arborele de Bugete
  const map = new Map<string, any>()
  const budgetCategoriesTree: any[] = []

  budgetCategoriesFlat.forEach((cat: any) => {
    map.set(cat._id.toString(), { ...cat, children: [], isActive: true })
  })

  map.forEach((cat: any) => {
    if (cat.parentId) {
      const parent = map.get(cat.parentId.toString())
      if (parent) parent.children.push(cat)
    } else {
      budgetCategoriesTree.push(cat)
    }
  })

  // --- CALCUL METRICI CUSTOM ---
  let totalUnpaidInvoices = 0
  let totalUnallocatedAdvances = 0

  balances.forEach((supplier: any) => {
    supplier.items.forEach((item: any) => {
      if (item.type === 'INVOICE') {
        // Adunăm facturile pozitive și le scădem pe cele negative (storno)
        totalUnpaidInvoices += item.mathematicalRemaining
      } else if (item.type === 'PAYMENT') {
        // Avansul este format strict din sumele plătite și nealocate
        totalUnallocatedAdvances += item.remainingAmount
      }
    })
  })

  return (
    <div className='flex flex-col h-full space-y-1.5'>
      <div className='flex flex-wrap items-center gap-3 sm:gap-4'>
        {/* 1. Furnizori în listă */}
        <div className='flex items-center gap-2 px-2 py-2 rounded-md border bg-muted/20 w-fit text-sm shadow-sm mb-1 mt-1'>
          <span className='text-muted-foreground font-semibold text-xs uppercase tracking-wide'>
            Furnizori în listă {query ? '(Filtrat)' : ''}:
          </span>
          <span className='font-bold font-mono text-sm text-foreground'>
            {balances.length}
          </span>
        </div>

        {/* 2. Sold Total */}
        <div className='flex items-center gap-2 px-2 py-2 rounded-md border bg-muted/20 w-fit text-sm shadow-sm mb-1 mt-1'>
          <span className='text-muted-foreground font-semibold text-xs uppercase tracking-wide'>
            Sold Total {query ? '(Filtrat)' : ''}:
          </span>
          <span className='font-bold font-mono text-sm text-red-600'>
            {formatCurrency(summary.totalNetBalance)}
          </span>
        </div>

        {/* 3. Facturi Neachitate */}
        <div className='flex items-center gap-2 px-2 py-2 rounded-md border bg-muted/20 w-fit text-sm shadow-sm mb-1 mt-1'>
          <span className='text-muted-foreground font-semibold text-xs uppercase tracking-wide'>
            Facturi Totale Neachitate {query ? '(Filtrat)' : ''}:
          </span>
          <span className='font-bold font-mono text-sm text-red-600'>
            {formatCurrency(summary.totalUnpaidInvoices)}
          </span>
        </div>

        {/* 4. Avans Total */}
        <div className='flex items-center gap-2 px-2 py-2 rounded-md border bg-muted/20 w-fit text-sm shadow-sm mb-1 mt-1'>
          <span className='text-muted-foreground font-semibold text-xs uppercase tracking-wide'>
            Avans Total Furnizori {query ? '(Filtrat)' : ''}:
          </span>
          <span className='font-bold font-mono text-sm text-green-600'>
            {formatCurrency(summary.totalUnallocatedAdvances)}
          </span>
        </div>
      </div>

      <div className='flex-1 min-h-0 overflow-hidden'>
        <SupplierBalancesList
          data={balances}
          suppliers={JSON.parse(JSON.stringify(suppliersFlat))}
          budgetCategories={JSON.parse(JSON.stringify(budgetCategoriesTree))}
          currentUser={
            session?.user?.id
              ? { id: session.user.id, name: session.user.name || '' }
              : undefined
          }
        />
      </div>
    </div>
  )
}
