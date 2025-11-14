import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { redirect } from 'next/navigation'

export default async function BudgetingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  if (!isAdmin) {
    redirect('/')
  }

  return <>{children}</>
}
