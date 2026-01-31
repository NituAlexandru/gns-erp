import { ReactNode } from 'react'
import { InventoryNav } from './inventory-nav'

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className='grid md:grid-cols-9 max-w-full p-0 mx-auto gap-8'>
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <InventoryNav />
        </div>
      </aside>

      <div className='md:col-span-8'>{children}</div>
    </div>
  )
}
