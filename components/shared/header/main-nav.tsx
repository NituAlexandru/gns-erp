'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import React from 'react'

export const links = [
  { title: 'Acasă', href: '/' },
  { title: 'Clienți', href: '/clients' },
  { title: 'Produse', href: '/products' },
  { title: 'NIR', href: '/nir' },
  { title: 'Comenzi', href: '/orders' },
  { title: 'Proforme', href: '/proforme' },
  { title: 'Avize', href: '/avize' },
  { title: 'Facturi', href: '/facturi' },
  { title: 'Storno', href: '/storno' },
  { title: 'Livrări', href: '/deliveries' },
]

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  return (
    <nav
      className={cn('flex items-center flex-wrap gap-2', className)}
      {...props}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'header-button p-0',
            pathname === item.href
              ? 'font-semibold text-white'
              : 'text-gray-400 hover:text-white'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
