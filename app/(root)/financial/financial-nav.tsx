// app/(root)/financial/financial-nav.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  FileCheck,
  FileText,
  FileMinus,
  ClipboardList,
  Receipt,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: '', label: 'Sumar', icon: <LayoutDashboard size={16} /> },
  { id: 'delivery-notes', label: 'Avize', icon: <FileCheck size={16} /> },
  { id: 'invoices', label: 'Facturi', icon: <FileText size={16} /> },
  { id: 'proformas', label: 'Proforme', icon: <ClipboardList size={16} /> },
  { id: 'storno', label: 'Storno', icon: <FileMinus size={16} /> },
  { id: 'receipts', label: 'Chitanțe', icon: <Receipt size={16} /> },
]

export default function FinancialNav() {
  const pathname = usePathname()
  const router = useRouter()

  const getActive = (id: string) =>
    id === ''
      ? pathname === '/financial'
      : pathname.includes(`/financial/${id}`)

  return (
    <nav className='flex flex-col gap-2'>
      {NAV_ITEMS.map((item) => (
        <Button
          key={item.id}
          variant={getActive(item.id) ? 'secondary' : 'ghost'}
          className='justify-start gap-2'
          onClick={() =>
            router.push(item.id ? `/financial/${item.id}` : '/financial')
          }
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </nav>
  )
}
