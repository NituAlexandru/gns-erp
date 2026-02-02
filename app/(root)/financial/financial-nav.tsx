'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  FileCheck,
  FileText,
  Receipt,
  FileInput,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: '', label: 'Sumar', icon: <LayoutDashboard size={16} /> },
  { id: 'delivery-notes', label: 'Avize', icon: <FileCheck size={16} /> },
  { id: 'invoices', label: 'Facturi Emise', icon: <FileText size={16} /> },
  {
    id: 'proformas',
    label: 'Facturi Proforme',
    icon: <FileText size={16} />,
  },
  { id: 'receipts', label: 'Chitanțe', icon: <Receipt size={16} /> },
  { id: 'nir', label: 'NIR-uri', icon: <FileInput size={16} /> },
]

export default function FinancialNav() {
  const pathname = usePathname()

  const getActive = (id: string) =>
    id === ''
      ? pathname === '/financial'
      : pathname.includes(`/financial/${id}`)

  return (
    <nav className='flex flex-col gap-2'>
      {NAV_ITEMS.map((item) => {
        const href = item.id ? `/financial/${item.id}` : '/financial'
        const isActive = getActive(item.id)

        return (
          <Button
            key={item.id}
            variant={isActive ? 'secondary' : 'ghost'}
            className='justify-start lg:justify-start gap-2 px-2 lg:px-4 transition-all duration-200'
            title={item.label}
            asChild
          >
            <Link href={href}>
              {item.icon}
              <span className='text-xs md:text-[10px] lg:text-xs min-[1274px]:text-sm whitespace-nowrap'>
                {item.label}
              </span>
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
