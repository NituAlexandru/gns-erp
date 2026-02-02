import { getAllClients } from '@/lib/db/modules/client/client.actions'
import ClientList from './client-list'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const resolvedParams = await searchParams

  const page = Number(resolvedParams.page) || 1
  const query = resolvedParams.q || ''

  const { data, totalPages } = await getAllClients({ page, query })

  return <ClientList data={data} totalPages={totalPages} currentPage={page} />
}
