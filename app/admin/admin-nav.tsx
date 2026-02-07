'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'

const links = [
  {
    title: 'Overview',
    href: '/admin/overview',
  },
  {
    title: 'Produse',
    href: '/admin/products',
  },
  {
    title: 'Categorii Produse',
    href: '/admin/categories',
  },
  {
    title: 'Stocuri',
    href: '/admin/management/inventory/stock',
  },
  {
    title: 'Receptie',
    href: '/admin/management/reception',
  },
  {
    title: 'Aprovizionare',
    href: '/admin/management/supplier-orders',
  },
  {
    title: 'Incasări si Plăti',
    href: '/admin/management/incasari-si-plati',
  },
  {
    title: 'Furnizori',
    href: '/admin/management/suppliers',
  },
  {
    title: 'Parc Auto',
    href: '/admin/management/fleet',
  },
  {
    title: 'Utilizatori',
    href: '/admin/users',
  },

  {
    title: 'Setări',
    href: '/admin/settings',
  },
  {
    title: 'Rapoarte',
    href: '/admin/reports',
  },
]
export function AdminNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  return (
    <nav
      className={cn(
        'flex items-center flex-wrap overflow-hidden gap-2 md:gap-4',
        className,
      )}
      {...props}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            '',
            pathname.includes(item.href) ? '' : 'text-muted-foreground',
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
