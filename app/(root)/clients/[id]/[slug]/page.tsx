import { notFound, redirect } from 'next/navigation'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import {
  getClientSummary,
  recalculateClientSummary,
  getClientLedger,
} from '@/lib/db/modules/client/summary/client-summary.actions'
import { getOrdersForClient } from '@/lib/db/modules/order/client-order.actions'
import { getDeliveriesForClient } from '@/lib/db/modules/deliveries/client-delivery.actions'
import { getDeliveryNotesForClient } from '@/lib/db/modules/financial/delivery-notes/client-delivery-note.actions'
import { getInvoicesForClient } from '@/lib/db/modules/financial/invoices/client-invoice.actions'
import { getProductStatsForClient } from '@/lib/db/modules/client/summary/client-product-stats.actions'

import { toSlug } from '@/lib/utils'
import { auth } from '@/auth'
import ClientFileView from './client-file-view'
import BackButton from '@/components/shared/back-button'

export default async function ClientViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; slug: string }>
  searchParams: Promise<{ tab?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'Admin'

  const { id, slug } = await params
  const resolvedSearchParams = await searchParams
  const tab = resolvedSearchParams.tab || 'details'
  const page = Number(resolvedSearchParams.page) || 1
  const statusFilter = resolvedSearchParams.status || 'ALL'

  const client = await getClientById(id)
  if (!client) return notFound()

  const canonical = toSlug(client.name)
  if (slug !== canonical) return redirect(`/clients/${id}/${canonical}`)

  if (tab === 'details') {
    await recalculateClientSummary(id, slug, true)
  }

  const summary = await getClientSummary(id)
  if (!summary) throw new Error('Eroare sumar client.')

  // 2. Încărcare date specifice TAB-ului (Switch pe server)
  let tabData: any = null

  switch (tab) {
    case 'orders':
      tabData = await getOrdersForClient(id, page)
      break
    case 'deliveries':
      tabData = await getDeliveriesForClient(id, page)
      break
    case 'notices':
      tabData = await getDeliveryNotesForClient(id, page)
      break
    case 'invoices':
      // Aici pasăm și filtrul de status dacă e cazul
      tabData = await getInvoicesForClient(id, page, statusFilter)
      break
    case 'payments':
      const ledgerRes = await getClientLedger(id)
      tabData = ledgerRes.success ? ledgerRes.data : []
      break
    case 'products':
      const prodRes = await getProductStatsForClient(id, page)
      tabData = prodRes.success ? prodRes : { data: [], totalPages: 0 }
      break
    default:
      tabData = null
  }

  return (
    <div className='px-6 space-y-6'>
      <div className='flex items-center gap-4 mb-5'>
        <BackButton />
        <h1 className='text-2xl font-bold'>Fișă Client: {client.name}</h1>
      </div>

      <ClientFileView
        client={client}
        summary={summary}
        isAdmin={isAdmin}
        clientSlug={slug}
        activeTab={tab}
        tabData={tabData}
        currentPage={page}
      />
    </div>
  )
}
