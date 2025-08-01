import { auth } from '@/auth'
import { getAllReceptions } from '@/lib/db/modules/reception/reception.actions'
import type { PopulatedReception } from '@/lib/db/modules/reception/types'
import ReceptionList from './reception-list'

export default async function AdminReceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  // Autentificare + control roluri
  const session = await auth()
  const allowedRoles = ['Administrator', 'Admin', 'Manager']
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error(
      'Nu aveți permisiunea necesară pentru a accesa această pagină.'
    )
  }

  // Citim pagina din query string
  const { page: pageParam } = await searchParams
  const currentPage = Number(pageParam) || 1

  // Preluăm toate recepțiile (folosim funcția existentă)
  const allReceptions: PopulatedReception[] = await getAllReceptions()

  // Pasăm lista completă + pagina curentă client-side
  return <ReceptionList initialData={allReceptions} currentPage={currentPage} />
}
