import { auth } from '@/auth'
import ReceptionList from './reception-list'
import { getAllReceptions } from '@/lib/db/modules/reception/reception.actions'
import { PAGE_SIZE } from '@/lib/constants'

export default async function AdminReceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    status?: string
    createdBy?: string
    q?: string
    from?: string
    to?: string
  }>
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
    throw new Error('Nu aveți permisiunea necesară.')
  }

  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || PAGE_SIZE

  // Apelăm funcția de backend direct
  const data = await getAllReceptions({
    page,
    pageSize,
    status: params.status,
    createdBy: params.createdBy,
    q: params.q,
    from: params.from,
    to: params.to,
  })

  return <ReceptionList initialData={data} />
}
