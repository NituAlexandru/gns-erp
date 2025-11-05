import React from 'react'
import FinancialNav from './financial-nav'

export default function FinancialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='grid md:grid-cols-5 max-w-full gap-2 p-0'>
      {/* Coloana stângă – meniu documente */}
      <aside className='md:col-span-1'>
        <div className='sticky top-24'>
          <FinancialNav />
        </div>
      </aside>

      {/* Coloana dreaptă – conținut */}
      <main className='md:col-span-4 '>{children}</main>
    </div>
  )
}
