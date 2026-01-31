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
      <h1 className='text-lg font-bold 2xl:text-xl'>Gestiune Stocuri</h1>
      <nav className='flex p-0 flex-col gap-1 mt-2 2xl:gap-2 2xl:mt-4'>
        <Button
          asChild
          variant={
            pathname === '/admin/management/inventory/stock'
              ? 'secondary'
              : 'ghost'
          }
          className='justify-start h-8 text-xs px-2 gap-1 2xl:h-10 2xl:text-sm 2xl:px-4 2xl:gap-2'
        >
          <Link href='/admin/management/inventory/stock'>
            <Combine size={16} />
            Stoc Total
          </Link>
        </Button>
        <p className='text-xs text-muted-foreground mt-2 px-0 2xl:text-sm 2xl:mt-4 2xl:px-2'>
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
            className='justify-start h-8 text-[10px] md:text-xs px-0 gap-1 2xl:h-8 2xl:text-sm 2xl:px-1 2xl:gap-1'
          >
            <Link
              href={`/admin/management/inventory/stock/${locationId}`}
              className='ml-0'
            >
              {locationIcons[locationId]}
              {LOCATION_NAMES_MAP[locationId]}
            </Link>
          </Button>
        ))}

        <hr className='my-1 2xl:my-2' />

        <Button
          asChild
          variant={
            pathname === '/admin/management/inventory/movements'
              ? 'secondary'
              : 'ghost'
          }
          className='justify-start h-8 text-xs px-2 gap-1 2xl:h-10 xl:text-sm 2xl:px-4 2xl:gap-2'
        >
          <Link href='/admin/management/inventory/movements'>
            <Boxes size={16} />
            Mișcări Stoc
          </Link>
        </Button>
      </nav>
    </aside>
  )
}
