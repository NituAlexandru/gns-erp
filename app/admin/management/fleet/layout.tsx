import { ReactNode } from 'react'
import { FleetNav } from './fleet-nav'

export default function FleetLayout({ children }: { children: ReactNode }) {
  return (
    <div className='grid md:grid-cols-5 max-w-full px-10 mx-auto gap-8'>
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <FleetNav />
        </div>
      </aside>

      <main className='md:col-span-4'>{children}</main>
    </div>
  )
}
