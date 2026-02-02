import { ReactNode } from 'react'
import Footer from '@/components/shared/footer'
import Header from '@/components/shared/header'
import { DashboardNav } from './dashboard-nav'
import { auth } from '@/auth'

export default async function HomeLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await auth()

  return (
    <div className='flex flex-col h-screen overflow-hidden'>
      <Header />

      <main className='flex-1 flex overflow-hidden'>
        <div className='flex px-5 gap-4 w-full h-full'>
          <aside className='min-w-[200px] py-4 overflow-y-auto'>
            <DashboardNav userRole={session?.user?.role} />
          </aside>

          <div className='flex-1 h-full w-full overflow-hidden'>{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
