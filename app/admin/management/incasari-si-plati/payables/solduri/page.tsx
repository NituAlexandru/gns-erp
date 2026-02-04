import { getSupplierBalances } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { SupplierBalancesList } from '../components/SupplierBalancesList'
import { formatCurrency } from '@/lib/utils'

// 1. Acceptăm searchParams
export default async function BalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''

  // 2. Trimitem query-ul la backend
  const balances = await getSupplierBalances(query)

  // 3. Calculăm totalul general
  const totalDebt = balances.reduce((acc, curr) => acc + curr.totalBalance, 0)

  return (
    <div className='flex flex-col h-full space-y-4'>
      {/* Sumar */}
      <div className='flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/20 w-fit shadow-sm'>
        <span className='text-muted-foreground font-medium text-sm uppercase tracking-wide'>
          Sold Total {query ? '(Filtrat)' : ''}:
        </span>
        <span className='font-bold font-mono text-lg text-red-600'>
          {formatCurrency(totalDebt)}
        </span>
      </div>

      {/* Lista */}
      <div className='flex-1 min-h-0 overflow-hidden'>
        <SupplierBalancesList data={balances} />
      </div>
    </div>
  )
}
