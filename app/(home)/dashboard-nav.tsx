'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, PlusCircle, Users, Briefcase } from 'lucide-react'

const DASHBOARD_LINKS = [
  { href: '/', label: 'Dashboard', icon: <Home size={16} /> },
  {
    href: '/orders/new',
    label: 'Comandă Nouă',
    icon: <PlusCircle size={16} />,
  },
  { href: '/clients/new', label: 'Client nou', icon: <Users size={16} /> }, // Adaugat cu iconanți', icon: <Users size={16} /> },
  {
    href: '/admin/management/suppliers',
    label: 'Furnizori',
    icon: <Briefcase size={16} />,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <aside className='py-3'>
      <h1 className='text-2xl font-bold ml-2'>Meniu</h1>
      <nav className='flex flex-col gap-2 mt-4'>
        {DASHBOARD_LINKS.map((link) => (
          <Button
            asChild
            key={link.href}
            variant={pathname === link.href ? 'secondary' : 'ghost'}
            className='justify-start gap-2'
          >
            <Link href={link.href}>
              {link.icon}
              {link.label}
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  )
}
