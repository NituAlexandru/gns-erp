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

  return (
    <div className='grid md:grid-cols-5 max-w-full gap-2 p-0'>
      {/* Coloana stângă – meniu documente */}
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <TreasuryNav isAdmin={isAdmin} />
        </div>
      </aside>

      {/* Coloana dreaptă – conținut */}
      <main className='md:col-span-4 '>{children}</main>
    </div>
  )
}
