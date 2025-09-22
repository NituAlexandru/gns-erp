import { ReactNode } from 'react'
import Footer from '@/components/shared/footer'
import Header from '@/components/shared/header'
import { DashboardNav } from './dashboard-nav'

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className=' '>
      <Header />

      <main>
        <div className='flex px-5 mx-auto gap-4 '>
          <aside className='min-w-[200px]'>
            <div className='sticky top-24'>
              <DashboardNav />
            </div>
          </aside>
          <div className='h-full'>{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
