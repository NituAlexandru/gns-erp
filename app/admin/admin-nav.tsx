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
    title: 'Comenzi',
    href: '/admin/orders',
  },
  {
    title: 'NIR',
    href: '/admin/nir',
  },
  {
    title: 'Avize',
    href: '/admin/avize',
  },
  {
    title: 'Facturi',
    href: '/admin/facturi',
  },
  {
    title: 'Utilizatori',
    href: '/admin/users',
  },
  {
    title: 'Agenți',
    href: '/admin/agenti',
  },
  {
    title: 'Setări',
    href: '/admin/settings',
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
        className
      )}
      {...props}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            '',
            pathname.includes(item.href) ? '' : 'text-muted-foreground'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
