'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatCurrency, toSlug } from '@/lib/utils'
import { useUnitConversion } from '@/hooks/use-unit-conversion'
import { ICatalogItem } from '@/lib/db/modules/catalog/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CatalogRowProps {
  item: ICatalogItem
  canManageProducts: boolean
  isAdmin: boolean
  setDeleteTarget: (item: ICatalogItem | null) => void
  setDeleteOpen: (open: boolean) => void
}

export function CatalogRow({
  item,
  canManageProducts,
  isAdmin,
  setDeleteTarget,
  setDeleteOpen,
}: CatalogRowProps) {
  const router = useRouter()

  const {
    convertedStock,
    selectedUnit,
    handleUnitChange,
    allUnits,
    convertedPrice: directPrice,
  } = useUnitConversion({
    item,
    baseStock: item.totalStock,
    basePrice: item.directDeliveryPrice,
  })

  const { convertedPrice: fullTruckPrice } = useUnitConversion({
    item,
    basePrice: item.fullTruckPrice,
  })
  const { convertedPrice: smallBizPrice } = useUnitConversion({
    item,
    basePrice: item.smallDeliveryBusinessPrice,
  })
  const { convertedPrice: retailPrice } = useUnitConversion({
    item,
    basePrice: item.retailPrice,
  })

  return (
    <TableRow className='hover:bg-muted/50'>
      <TableCell>{item.productCode || '-'}</TableCell>
      <TableCell className='p-0 h-10 w-12'>
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            priority
            width={45}
            height={45}
            style={{ width: '50px', height: '50px' }}
            className='ml-3 object-contain'
          />
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/catalog-produse/${item._id}/${toSlug(item.name)}`}
                className='block max-w-[350px] truncate hover:underline'
              >
                {item.name}
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>{item.category || '-'}</TableCell>
      <TableCell>{formatCurrency(directPrice)}</TableCell>
      <TableCell>{formatCurrency(fullTruckPrice)}</TableCell>
      <TableCell>{formatCurrency(smallBizPrice)}</TableCell>
      <TableCell>{formatCurrency(retailPrice)}</TableCell>
      <TableCell>{convertedStock.toFixed(2)}</TableCell>
      <TableCell>
        <Select value={selectedUnit} onValueChange={handleUnitChange}>
          <SelectTrigger className='w-[100px] h-8 p-2 text-sm cursor-pointer'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allUnits.map((u) => (
              <SelectItem key={u.unitName} value={u.unitName}>
                {u.unitName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>{item.barCode || '-'}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              Acțiuni
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              className='cursor-pointer hover:bg-muted/50'
              onSelect={() =>
                router.push(`/catalog-produse/${item._id}/${toSlug(item.name)}`)
              }
            >
              Vizualizează
            </DropdownMenuItem>
            {canManageProducts && (
              <DropdownMenuItem
                className='cursor-pointer hover:bg-muted/50'
                onSelect={() =>
                  router.push(`/admin/management/products/${item._id}/edit`)
                }
              >
                Editează
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem
                className='cursor-pointer hover:bg-muted/50'
                onSelect={() => {
                  setDeleteTarget(item)
                  setDeleteOpen(true)
                }}
              >
                Șterge Produs
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
