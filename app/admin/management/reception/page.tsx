import { auth } from '@/auth'
import ReceptionList from './reception-list'

export default async function AdminReceptionsPage() {
  const session = await auth()
  const allowedRoles = ['Administrator', 'Admin', 'Manager']

  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error(
      'Nu aveți permisiunea necesară pentru a accesa această pagină.'
    )
  }

  return <ReceptionList />
}
