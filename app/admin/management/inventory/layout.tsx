import { ReactNode } from 'react'
import { InventoryNav } from './inventory-nav'

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className='grid md:grid-cols-5 max-w-full px-10 mx-auto gap-8'>
      {/* Meniul din stânga, acum ca o componentă separată */}
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <InventoryNav />
        </div>
      </aside>

      <div className='md:col-span-4'>{children}</div>
    </div>
  )
}
