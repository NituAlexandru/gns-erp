import { notFound, redirect } from 'next/navigation'
import { getSupplierById } from '@/lib/db/modules/suppliers/supplier.actions'
import {
  getSupplierSummary,
  recalculateSupplierSummary,
  getSupplierLedger,
} from '@/lib/db/modules/suppliers/summary/supplier-summary.actions'
import { toSlug } from '@/lib/utils'
import { auth } from '@/auth'
import SupplierFileView from './supplier-file-view'
import BackButton from '@/components/shared/back-button'
import {
  getInvoicesForSupplier,
  getReceptionsForSupplier,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { getProductStatsForSupplier } from '@/lib/db/modules/suppliers/summary/supplier-product-stats.actions'

export default async function SupplierViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; slug: string }>
  searchParams: Promise<{ tab?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  const allowedRoles = [
    'Administrator',
    'Admin',
    'Manager',
    'administrator',
    'admin',
    'manager',
  ]
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
  }

  const { id, slug } = await params
  const resolvedSearchParams = await searchParams
  const tab = resolvedSearchParams.tab || 'details'
  const page = Number(resolvedSearchParams.page) || 1

  const supplierRaw = await getSupplierById(id)
  if (!supplierRaw) return notFound()
  const supplier = JSON.parse(JSON.stringify(supplierRaw))

  const canonical = toSlug(supplier.name)
  if (slug !== canonical) {
    return redirect(`/admin/management/suppliers/${id}/${canonical}`)
  }

  // 2. Sumar
  if (tab === 'details') {
    await recalculateSupplierSummary(id, slug, true)
  }
  const summaryRaw = await getSupplierSummary(id)
  if (!summaryRaw) throw new Error('Eroare sumar furnizor.')
  const summary = JSON.parse(JSON.stringify(summaryRaw))

  // 3. Încărcare date specifice Tab-ului
  let tabDataRaw: any = null

  switch (tab) {
    case 'receptions':
      tabDataRaw = await getReceptionsForSupplier(id, page)
      break
    case 'invoices':
      tabDataRaw = await getInvoicesForSupplier(id, page)
      break
    case 'payments':
      const ledgerRes = await getSupplierLedger(id)
      tabDataRaw = ledgerRes.success ? ledgerRes.data : []
      break
    case 'products':
      const prodRes = await getProductStatsForSupplier(id, page)
      tabDataRaw = prodRes.success ? prodRes : { data: [], totalPages: 0 }
      break
    default:
      tabDataRaw = null
  }

  const tabData = tabDataRaw ? JSON.parse(JSON.stringify(tabDataRaw)) : null

  return (
    <div className='px-6 space-y-6'>
      <div className='flex items-center gap-4 mb-5'>
        <BackButton />
        <h1 className='text-2xl font-bold'>Fișă Furnizor: {supplier.name}</h1>
      </div>

      <SupplierFileView
        supplier={supplier}
        summary={summary}
        activeTab={tab}
        tabData={tabData}
        currentPage={page}
      />
    </div>
  )
}
