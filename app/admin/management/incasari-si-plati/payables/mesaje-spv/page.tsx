import { getAnafInboxErrors } from '@/lib/db/modules/setting/efactura/anaf.actions'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { AnafInboxTable } from '../components/AnafImboxTable'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = params.status

  // Backend-ul a fost deja actualizat la Pasul 1 să accepte 'statusFilter'
  const inboxData = await getAnafInboxErrors(page, PAYABLES_PAGE_SIZE, status)

  const safeData = {
    ...inboxData,
    data: inboxData.data as any[],
  }

  return <AnafInboxTable data={safeData} />
}
