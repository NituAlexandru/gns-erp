'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Car, User, Container, ClipboardList } from 'lucide-react'

// Definim linkurile și iconițele într-un singur loc, la fel ca în model
const FLEET_LINKS = [
  {
    id: 'vehicles',
    href: '/admin/management/fleet/vehicles',
    label: 'Vehicule',
    icon: <Car size={16} />,
  },
  {
    id: 'drivers',
    href: '/admin/management/fleet/drivers',
    label: 'Șoferi',
    icon: <User size={16} />,
  },
  {
    id: 'trailers',
    href: '/admin/management/fleet/trailers',
    label: 'Remorci',
    icon: <Container size={16} />,
  },
  {
    id: 'assignments',
    href: '/admin/management/fleet/assignments',
    label: 'Ansambluri',
    icon: <ClipboardList size={16} />,
  },
]

export function FleetNav() {
  const pathname = usePathname()

  return (
    <aside>
      <h1 className='text-2xl font-bold ml-2'>Parc Auto</h1>
      <nav className='flex flex-col gap-2 mt-4'>
        {/*
          Structura este păstrată identic.
          Am adăugat un titlu <p> deasupra listei, la fel ca "Stocuri pe Locații".
        */}
        <p className='text-sm text-muted-foreground mt-4 px-2'>
          Management Flotă
        </p>

        {FLEET_LINKS.map((link) => (
          <Button
            asChild
            key={link.id}
            variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'}
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
