'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { formatCurrency, toSlug } from '@/lib/utils'
import { useUnitConversion } from '@/hooks/use-unit-conversion'
import { IAdminCatalogItem } from '@/lib/db/modules/catalog/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type RowState = {
  direct: number
  fullTruck: number
  smallBiz: number
  retail: number
}

interface ProductRowProps {
  item: IAdminCatalogItem
  onMarkupChange: (
    id: string,
    key: keyof RowState,
    val: number,
    fallback: RowState
  ) => void
  onUpdate: (id: string) => void
  dirtyRows: Record<string, boolean>
  rows: Record<string, RowState>
  setDeactivateTarget: (item: IAdminCatalogItem) => void
  setDeactivateOpen: (open: boolean) => void
  setActivateTarget: (item: IAdminCatalogItem) => void
  setActivateOpen: (open: boolean) => void
  setDeleteTarget: (item: IAdminCatalogItem) => void
  setDeleteOpen: (open: boolean) => void
}

export function ProductRow({
  item,
  onMarkupChange,
  onUpdate,
  dirtyRows,
  rows,
  setDeactivateTarget,
  setDeactivateOpen,
  setActivateTarget,
  setActivateOpen,
  setDeleteTarget,
  setDeleteOpen,
}: ProductRowProps) {
  const router = useRouter()

  const {
    convertedPrice,
    convertedStock,
    selectedUnit,
    handleUnitChange,
    allUnits,
  } = useUnitConversion({
    item: item,
    basePrice: item.averagePurchasePrice,
    baseStock: item.totalStock,
  })

  const fallback: RowState = {
    direct: item.defaultMarkups?.markupDirectDeliveryPrice ?? 0,
    fullTruck: item.defaultMarkups?.markupFullTruckPrice ?? 0,
    smallBiz: item.defaultMarkups?.markupSmallDeliveryBusinessPrice ?? 0,
    retail: item.defaultMarkups?.markupRetailPrice ?? 0,
  }

  const rowVals = rows[item._id] ?? fallback

  const directPrice = convertedPrice * (1 + rowVals.direct / 100)
  const fullTruckPrice = convertedPrice * (1 + rowVals.fullTruck / 100)
  const smallBizPrice = convertedPrice * (1 + rowVals.smallBiz / 100)
  const retailPrice = convertedPrice * (1 + rowVals.retail / 100)

  return (
    <TableRow className='hover:bg-muted/50'>
      <TableCell>{item.productCode}</TableCell>
      <TableCell className='p-0 h-10 w-12'>
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            priority
            width={45}
            height={45}
            style={{ width: '45px', height: '45px' }}
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
                className='block max-w-[350px] truncate'
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
      <TableCell>{formatCurrency(convertedPrice)}</TableCell>
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
      <TableCell className='font-bold text-right'>
        {convertedStock.toFixed(2)}
      </TableCell>
      <TableCell className='text-right'>
        <Input
          type='number'
          value={String(rowVals.direct)}
          onChange={(e) =>
            onMarkupChange(item._id, 'direct', Number(e.target.value), fallback)
          }
          className='w-20'
        />
      </TableCell>
      <TableCell>{formatCurrency(directPrice)}</TableCell>
      <TableCell className='text-right'>
        <Input
          type='number'
          value={String(rowVals.fullTruck)}
          onChange={(e) =>
            onMarkupChange(
              item._id,
              'fullTruck',
              Number(e.target.value),
              fallback
            )
          }
          className='w-20'
        />
      </TableCell>
      <TableCell>{formatCurrency(fullTruckPrice)}</TableCell>
      <TableCell className='text-right'>
        <Input
          type='number'
          value={String(rowVals.smallBiz)}
          onChange={(e) =>
            onMarkupChange(
              item._id,
              'smallBiz',
              Number(e.target.value),
              fallback
            )
          }
          className='w-20'
        />
      </TableCell>
      <TableCell>{formatCurrency(smallBizPrice)}</TableCell>
      <TableCell className='text-right'>
        <Input
          type='number'
          value={String(rowVals.retail)}
          onChange={(e) =>
            onMarkupChange(item._id, 'retail', Number(e.target.value), fallback)
          }
          className='w-20'
        />
      </TableCell>
      <TableCell>{formatCurrency(retailPrice)}</TableCell>
      <TableCell>
        {item.isPublished ? (
          <span className='text-green-500'>Activ</span>
        ) : (
          <span className='text-red-500'>Inactiv</span>
        )}
      </TableCell>

      <TableCell>
        <Button
          size='sm'
          variant={dirtyRows[item._id] ? 'default' : 'outline'}
          onClick={() => onUpdate(item._id)}
        >
          Salvează
        </Button>
      </TableCell>
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
            <DropdownMenuItem
              className='cursor-pointer hover:bg-muted/50'
              onSelect={() =>
                router.push(`/admin/management/products/${item._id}/edit`)
              }
            >
              Editează
            </DropdownMenuItem>
            {item.isPublished ? (
              <DropdownMenuItem
                className='cursor-pointer hover:bg-muted/50'
                onSelect={() => {
                  setDeactivateTarget(item)
                  setDeactivateOpen(true)
                }}
              >
                Dezactivează
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className='cursor-pointer hover:bg-muted/50'
                onSelect={() => {
                  setActivateTarget(item)
                  setActivateOpen(true)
                }}
              >
                Activează
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className='cursor-pointer hover:bg-muted/50'
              onSelect={() => {
                setDeleteTarget(item)
                setDeleteOpen(true)
              }}
            >
              Șterge definitiv
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
