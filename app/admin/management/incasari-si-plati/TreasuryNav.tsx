'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Library,
} from 'lucide-react'

// Definim TOATE link-urile posibile
const ALL_NAV_ITEMS = [
  {
    id: '',
    label: 'Sumar Trezorerie',
    icon: <LayoutDashboard size={16} />,
    adminOnly: false,
  },
  {
    id: 'receivables',
    label: 'Încasări Clienți',
    icon: <TrendingUp size={16} />,
    adminOnly: false,
  },
  {
    id: 'payables',
    label: 'Plăți Furnizori',
    icon: <TrendingDown size={16} />,
    adminOnly: true,
  },
  {
    id: 'budgeting',
    label: 'Categorii Buget',
    icon: <Library size={16} />,
    adminOnly: true,
  },
]

export default function TreasuryNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  const getActive = (id: string) =>
    id === ''
      ? pathname === '/admin/management/incasari-si-plati'
      : pathname.includes(`/admin/management/incasari-si-plati/${id}`)

  // FILTRĂM link-urile pe care le vom afișa
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.adminOnly) {
      return isAdmin
    }
    return true
  })

  return (
    <nav className='flex flex-col gap-2'>
      {visibleNavItems.map((item) => (
        <Button
          key={item.id}
          variant={getActive(item.id) ? 'secondary' : 'ghost'}
          className='justify-start gap-2'
          onClick={() =>
            router.push(
              item.id
                ? `/admin/management/incasari-si-plati/${item.id}`
                : '/admin/management/incasari-si-plati'
            )
          }
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </nav>
  )
}
