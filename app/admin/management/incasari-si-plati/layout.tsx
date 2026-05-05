import { auth } from '@/auth'
import TreasuryNav from './TreasuryNav'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

export default async function TreasuryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())
  const isManager = userRole.toLowerCase() === 'manager'

  return (
    <div className='grid md:grid-cols-7 max-w-full gap-1 p-0'>
      <aside className='md:col-span-1 border-r'>
        <div className='sticky top-[5rem] p-0'>
          <TreasuryNav isAdmin={isAdmin} />
        </div>
      </aside>

      <main className='md:col-span-6'>{children}</main>
    </div>
  )
}
