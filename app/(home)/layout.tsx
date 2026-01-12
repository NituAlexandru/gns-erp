import { ReactNode } from 'react'
import Footer from '@/components/shared/footer'
import Header from '@/components/shared/header'
import { DashboardNav } from './dashboard-nav'

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className=' '>
      <Header />

      <main>
        {/* Poți scoate mx-auto dacă vrei să fie full-width fluid, sau îl lași dacă vrei centrat */}
        <div className='flex px-5 gap-4 w-full'>
          <aside className='min-w-[200px]'>
            <div className='sticky top-24'>
              <DashboardNav />
            </div>
          </aside>

          {/* AICI ERA PROBLEMA: Am adăugat 'flex-1' și 'w-full' */}
          <div className='h-full flex-1 w-full'>{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
