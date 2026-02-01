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
import { MoreHorizontal, Save } from 'lucide-react'

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
    fallback: RowState,
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
    <TableRow className='hover:bg-muted/50 border-b'>
       <TableCell className='text-[10px] p-0 py-0.5 lg:py-1.5 2xl:py-1 h-auto lg:text-xs xl:text-sm font-mono'>
        {item.productCode}
      </TableCell>

      <TableCell className='p-0 py-0.5 lg:py-1.5 2xl:py-1 w-8 h-8 xl:w-16 xl:h-12'>
        {item.image ? (
          <div className='relative w-[30px] h-[30px] ml-1 lg:w-[45px] lg:h-[45px] lg:ml-3'>
            <Image
              src={item.image}
              alt={item.name}
              fill
              className='object-contain'
            />
          </div>
        ) : (
          <span className='text-[10px] ml-1 lg:ml-3 lg:text-xs xl:text-sm'>
            -
          </span>
        )}
      </TableCell>

      <TableCell className='p-0 py-0.5 lg:py-1.5 2xl:py-1 max-w-[100px] lg:max-w-[150px] xl:max-w-[200px] 2xl:max-w-[220px] 3xl:max-w-[350px]'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/catalog-produse/${item._id}/${toSlug(item.name)}`}
                className='block truncate text-[10px] xl:text-xs 2xl:text-sm'
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

      {/* PREȚ INTRARE */}
      <TableCell className='text-[10px] text-right p-0 pr-1 py-0.5 lg:py-1.5 2xl:py-1 lg:text-xs 2xl:text-sm  whitespace-nowrap'>
        {formatCurrency(convertedPrice)}
      </TableCell>

      {/* UM SELECT: Foarte compact pe mobil */}
      <TableCell className='p-0 py-0.5 lg:py-1.5 2xl:py-1 '>
        <Select value={selectedUnit} onValueChange={handleUnitChange}>
          <SelectTrigger className='w-[65px] h-6 text-[10px] px-1 lg:w-[80px] xl:w-[100px] lg:h-8 lg:p-2 lg:text-xs xl:text-sm cursor-pointer'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allUnits.map((u) => (
              <SelectItem
                key={u.unitName}
                value={u.unitName}
                className='text-xs lg:text-xs xl:text-sm cursor-pointer'
              >
                {u.unitName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* STOC */}
      <TableCell className='font-bold text-left text-[10px] p-0 py-0.5 lg:py-1.5 2xl:py-1 xl:text-xs 2xl:text-sm '>
        {convertedStock.toFixed(2)}
      </TableCell>

      {/* Direct */}
      <TableCell className='text-right p-0 py-0.5 xl:py-1 border-l-2 border-border'>
        <Input
          type='number'
          value={String(rowVals.direct)}
          onChange={(e) =>
            onMarkupChange(item._id, 'direct', Number(e.target.value), fallback)
          }
          className='w-12 h-6 text-[10px] px-1 lg:w-14 xl:w-20 lg:h-9 lg:text-xs xl:text-sm lg:px-3 text-right ml-auto mr-1'
        />
      </TableCell>
      <TableCell className='text-[10px] text-left p-0 py-0.5 lg:py-1.5 2xl:py-1 lg:text-xs xl:text-sm  whitespace-nowrap'>
        {formatCurrency(directPrice)}
      </TableCell>

      {/* Full Truck */}
      <TableCell className='text-right p-0 py-0.5 xl:py-1 border-l-2 border-border'>
        <Input
          type='number'
          value={String(rowVals.fullTruck)}
          onChange={(e) =>
            onMarkupChange(
              item._id,
              'fullTruck',
              Number(e.target.value),
              fallback,
            )
          }
          className='w-12 h-6 text-[10px] px-1 lg:w-14 xl:w-20 lg:h-9 lg:text-xs xl:text-sm lg:px-3 text-right ml-auto mr-1'
        />
      </TableCell>
      <TableCell className='text-[10px] p-0 py-0.5 lg:py-1.5 2xl:py-1 lg:text-xs xl:text-sm  whitespace-nowrap text-left'>
        {formatCurrency(fullTruckPrice)}
      </TableCell>

      {/* Small Biz */}
      <TableCell className='text-right p-0 py-0.5 xl:py-1 border-l-2 border-border'>
        <Input
          type='number'
          value={String(rowVals.smallBiz)}
          onChange={(e) =>
            onMarkupChange(
              item._id,
              'smallBiz',
              Number(e.target.value),
              fallback,
            )
          }
          className='w-12 h-6 text-[10px] px-1 lg:w-14 xl:w-20 lg:h-9 lg:text-xs xl:text-sm lg:px-3 text-right ml-auto mr-1'
        />
      </TableCell>
      <TableCell className='text-[10px] p-0 py-0.5 lg:py-1.5 2xl:py-1 lg:text-xs xl:text-sm  whitespace-nowrap text-left'>
        {formatCurrency(smallBizPrice)}
      </TableCell>

      {/* Retail */}
      <TableCell className='text-left p-0 py-0.5 xl:py-1 border-l-2 border-border'>
        <Input
          type='number'
          value={String(rowVals.retail)}
          onChange={(e) =>
            onMarkupChange(item._id, 'retail', Number(e.target.value), fallback)
          }
          className='w-12 h-6 text-[10px] px-1 lg:w-14 xl:w-20 lg:h-9 lg:text-xs xl:text-sm lg:px-3 text-right ml-auto mr-1'
        />
      </TableCell>
      <TableCell className='text-[10px] p-0 py-0.5 lg:py-1.5 2xl:py-1 lg:text-xs xl:text-sm  whitespace-nowrap text-left'>
        {formatCurrency(retailPrice)}
      </TableCell>

      {/* STATUS */}
      <TableCell className='text-[10px] p-0 py-0.5 lg:py-1.5 2xl:py-1 lg:text-xs xl:text-sm  text-center'>
        {item.isPublished ? (
          <span className='text-green-500'>Activ</span>
        ) : (
          <span className='text-red-500'>Inactiv</span>
        )}
      </TableCell>

      {/* BUTON SALVEAZĂ: h-6 text-[10px] */}
      <TableCell className='p-0 py-0.5 lg:py-1.5 2xl:py-1 '>
        <Button
          size='sm'
          variant={dirtyRows[item._id] ? 'default' : 'outline'}
          onClick={() => onUpdate(item._id)}
          className='h-6 text-[10px] px-2 xl:h-9 2xl:text-sm xl:px-4'
        >
          <Save className='w-3 h-3' />
        </Button>
      </TableCell>

      {/* BUTON ACȚIUNI: h-6 text-[10px] */}
      <TableCell className='p-0 py-0.5 lg:py-1.5 2xl:py-1 '>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-6 text-[10px] px-2 xl:h-9 2xl:text-sm xl:px-4'
            >
              <MoreHorizontal className='w-3 h-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              className='cursor-pointer text-xs lg:text-xs xl:text-sm'
              onSelect={() =>
                router.push(`/catalog-produse/${item._id}/${toSlug(item.name)}`)
              }
            >
              Vizualizează
            </DropdownMenuItem>
            <DropdownMenuItem
              className='cursor-pointer text-xs lg:text-xs xl:text-sm'
              onSelect={() =>
                router.push(`/admin/management/products/${item._id}/edit`)
              }
            >
              Editează
            </DropdownMenuItem>
            {item.isPublished ? (
              <DropdownMenuItem
                className='cursor-pointer text-xs lg:text-xs xl:text-sm'
                onSelect={() => {
                  setDeactivateTarget(item)
                  setDeactivateOpen(true)
                }}
              >
                Dezactivează
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className='cursor-pointer text-xs lg:text-xs xl:text-sm'
                onSelect={() => {
                  setActivateTarget(item)
                  setActivateOpen(true)
                }}
              >
                Activează
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className='cursor-pointer text-xs lg:text-xs xl:text-sm'
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
