// app/admin/management/inventory/inventory-nav.tsx

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Boxes,
  Combine,
  Warehouse,
  Truck,
  PackageCheck,
  Building,
  UserCheck,
} from 'lucide-react'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import { InventoryLocation } from '@/lib/db/modules/inventory/types'
import { ReactNode } from 'react'

// Harta cu iconițe, definită local în componenta de UI
const locationIcons: Record<InventoryLocation, ReactNode> = {
  DEPOZIT: <Warehouse size={16} />,
  IN_TRANZIT: <Truck size={16} />,
  LIVRARE_DIRECTA: <PackageCheck size={16} />,
  CUSTODIE_FURNIZOR: <Building size={16} />,
  CUSTODIE_GNS: <Warehouse size={16} />,
  CUSTODIE_PENTRU_CLIENT: <UserCheck size={16} />,
}

export function InventoryNav() {
  const pathname = usePathname()

  return (
    <aside>
      <h1 className='text-2xl font-bold'>Gestiune Stocuri</h1>
      <nav className='flex flex-col gap-2 mt-4'>
        <Button
          asChild
          variant={
            pathname === '/admin/management/inventory/stock'
              ? 'secondary'
              : 'ghost'
          }
          className='justify-start gap-2'
        >
          <Link href='/admin/management/inventory/stock'>
            <Combine size={16} />
            Stoc Total Agregat
          </Link>
        </Button>

        <p className='text-sm text-muted-foreground mt-4 px-2'>
          Stocuri pe Locații
        </p>
        {INVENTORY_LOCATIONS.map((locationId) => (
          <Button
            asChild
            key={locationId}
            variant={
              pathname === `/admin/management/inventory/stock/${locationId}`
                ? 'secondary'
                : 'ghost'
            }
            className='justify-start gap-2'
          >
            <Link href={`/admin/management/inventory/stock/${locationId}`}>
              {locationIcons[locationId]}
              {LOCATION_NAMES_MAP[locationId]}
            </Link>
          </Button>
        ))}

        <hr className='my-2' />

        <Button
          asChild
          variant={
            pathname === '/admin/management/inventory/movements'
              ? 'secondary'
              : 'ghost'
          }
          className='justify-start gap-2'
        >
          <Link href='/admin/management/inventory/movements'>
            <Boxes size={16} />
            Mișcări Stoc (Jurnal)
          </Link>
        </Button>
      </nav>
    </aside>
  )
}
