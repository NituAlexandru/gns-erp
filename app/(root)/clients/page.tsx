import { getAllClients } from '@/lib/db/modules/client/client.actions'
import ClientList from './client-list'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1
  const data = await getAllClients({ page })
  return <ClientList initialData={data} currentPage={page} />
}
