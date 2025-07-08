// app/admin/management/management-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'

const links = [
  {
    title: 'Overview',
    href: '/admin/management/overview',
  },
  {
    title: 'Furnizori',
    href: '/admin/management/suppliers',
  },
  {
    title: 'Clienți',
    href: '/clients',
  },
]

export function ManagementNav({
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
            'transition-colors hover:text-white',
            pathname.startsWith(item.href)
              ? 'text-white font-semibold'
              : 'text-muted-foreground'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
