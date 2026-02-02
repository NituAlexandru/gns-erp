'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Home,
  PlusCircle,
  Users,
  Briefcase,
  FileText,
  Receipt,
  Package,
  ArrowDownToLine,
  CircleDollarSign,
  ShoppingCart,
} from 'lucide-react'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles' // Asigură-te că importul e corect

const DASHBOARD_LINKS = [
  { href: '/', label: 'Dashboard', icon: <Home size={16} /> },
  {
    href: '/orders/new',
    label: 'Comandă Nouă',
    icon: <PlusCircle size={16} />,
  },
  { href: '/clients/new', label: 'Client nou', icon: <Users size={16} /> },
  {
    href: '/financial/proformas',
    label: 'Proforme',
    icon: <FileText size={16} />,
  },
  {
    href: '/financial/invoices',
    label: 'Facturi',
    icon: <Receipt size={16} />,
  },
  // --- RESTRICȚIONATE (Super Admin) ---
  {
    href: '/admin/management/suppliers',
    label: 'Furnizori',
    icon: <Briefcase size={16} />,
    // Adăugăm un flag pentru a ști că acest link e restricționat
    restricted: true,
  },

  {
    href: '/admin/management/incasari-si-plati',
    label: 'Încasări și Plăți',
    icon: <CircleDollarSign size={16} />,
    restricted: true,
  },
  {
    href: '/admin/management/reception',
    label: 'Recepții',
    icon: <ArrowDownToLine size={16} />,
    restricted: true,
  },
  {
    href: '/admin/management/supplier-orders',
    label: 'Aprovizionare',
    icon: <ShoppingCart size={16} />,
    restricted: true,
  },
  {
    href: '/admin/management/inventory/stock',
    label: 'Stocuri',
    icon: <Package size={16} />,
    restricted: true,
  },
]

interface DashboardNavProps {
  userRole?: string
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()

  // Verificăm dacă rolul utilizatorului este în lista de Super Admin
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(userRole || '')

  // Filtrăm link-urile
  const visibleLinks = DASHBOARD_LINKS.filter((link) => {
    // Dacă link-ul este marcat ca 'restricted', îl afișăm doar dacă e super admin
    if (link.restricted) {
      return isSuperAdmin
    }
    // Altfel, afișăm link-ul tuturor
    return true
  })

  return (
    <aside className='py-3'>
      <h1 className='text-2xl font-bold ml-2'>Meniu</h1>
      <nav className='flex flex-col gap-2 mt-4'>
        {visibleLinks.map((link) => (
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
