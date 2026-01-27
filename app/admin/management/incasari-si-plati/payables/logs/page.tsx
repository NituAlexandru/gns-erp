import { getAnafLogs } from '@/lib/db/modules/setting/efactura/anaf.actions'
import { AnafLogsTable } from '../components/AnafLogsTable' // Import din parent components
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const type = params.type // Pentru filtrare ulterioară (ERROR, INFO)

  const logsData = await getAnafLogs(page, PAYABLES_PAGE_SIZE, type)

  // Cast rapid pentru compatibilitate tipuri (backend vs frontend)
  const safeData = {
    ...logsData,
    data: logsData.data as any[],
  }

  return <AnafLogsTable data={safeData} />
}
