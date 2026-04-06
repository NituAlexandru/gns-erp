import { getAnafInboxErrors } from '@/lib/db/modules/setting/efactura/anaf.actions'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { AnafInboxTable } from '../components/AnafImboxTable'
import { auth } from '@/auth'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth() // <-- 2. Preluăm sesiunea
  const params = await searchParams
  const page = Number(params.page) || 1
  const status = params.status

  const inboxData = await getAnafInboxErrors(page, PAYABLES_PAGE_SIZE, status)

  const safeData = {
    ...inboxData,
    data: inboxData.data as any[],
  }

  // 3. Trimitem userRole către componenta de client
  return <AnafInboxTable data={safeData} userRole={session?.user?.role} />
}
