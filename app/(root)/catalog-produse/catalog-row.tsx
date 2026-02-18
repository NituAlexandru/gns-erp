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
import { MoreHorizontal } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Separator } from '@/components/ui/separator'
import ProductPreviewContent from './details/product-preview-content'
import { Badge } from '@/components/ui/badge'

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
    conversionFactor,
  } = useUnitConversion({
    item,
    baseStock: item.totalStock,
    basePrice: item.directDeliveryPrice,
  })

  // 2. CALCULĂM CELELALTE PREȚURI FOLOSIND FACTORUL COMUN
  // Dacă factorul e 50 (Pal), înmulțim toate prețurile de bază cu 50.
  const fullTruckPrice = item.fullTruckPrice * conversionFactor
  const smallBizPrice = item.smallDeliveryBusinessPrice * conversionFactor
  const retailPrice = item.retailPrice * conversionFactor

  return (
    <TableRow className='hover:bg-muted/50 border-b'>
      {/* COD */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs   font-mono'>
        {item.productCode || '-'}
      </TableCell>

      {/* IMAGINE - PREVIEW-UL */}
      <TableCell className='p-0 xl:py-1 w-8 h-8 xl:w-16 xl:h-12'>
        <HoverCard openDelay={100}>
          <HoverCardTrigger asChild>
            <div className='relative w-[30px] h-[30px] ml-1 lg:w-[45px] lg:h-[45px] lg:ml-3 cursor-pointer hover:opacity-80 transition-opacity'>
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className='object-contain'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground text-[10px] rounded'>
                  -
                </div>
              )}
            </div>
          </HoverCardTrigger>

          <HoverCardContent
            side='right'
            align='start'
            sideOffset={100}
            collisionPadding={40}
            className='z-[100] w-[calc(100vw-2rem)] max-w-[1100px] p-0 border-2 border-border shadow-2xl bg-background overflow-hidden'
          >
            <div className='bg-muted/50 p-4 border-b flex justify-between items-center'>
              <span className='font-bold text-xs lg:text-sm uppercase truncate mr-4'>
                {item.name}
              </span>
              <Badge
                variant='outline'
                className='hidden sm:block font-mono text-[10px]'
              >
                {item.productCode}
              </Badge>
            </div>

            <div className='p-4 lg:p-6 max-h-[85vh] overflow-y-auto bg-background'>
              <ProductPreviewContent
                id={item._id}
                slug={toSlug(item.name)}
                isAdmin={isAdmin}
              />
            </div>
          </HoverCardContent>
        </HoverCard>
      </TableCell>

      {/* NUME PRODUS */}
      <TableCell className='p-0 xl:py-1 max-w-[100px] lg:max-w-[180px] xl:max-w-[200px] 2xl:max-w-[250px] 3xl:max-w-[350px]'>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                href={`/catalog-produse/${item._id}/${toSlug(item.name)}`}
                className='block truncate text-[10px] xl:text-sm 2xl:text-xs font-medium hover:underline mr-3'
              >
                {item.name}
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p className='text-xs font-medium'>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* CATEGORIE */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs truncate max-w-[80px] lg:max-w-none border-l-1 border-border pl-1 '>
        {item.category || '-'}
      </TableCell>

      {/* --- PREȚURI (Whitespace nowrap + Text Right) --- */}

      {/* Livrare Directă */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs   whitespace-nowrap text-right'>
        {formatCurrency(directPrice)}
      </TableCell>

      {/* Macara / Tir */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs   whitespace-nowrap text-right'>
        {formatCurrency(fullTruckPrice)}
      </TableCell>

      {/* Comenzi Mici PJ */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs   whitespace-nowrap text-right'>
        {formatCurrency(smallBizPrice)}
      </TableCell>

      {/* Retail PF */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs whitespace-nowrap text-right font-semibold'>
        {formatCurrency(retailPrice)}
      </TableCell>

      {/* STOC */}
      <TableCell className='text-[10px] p-0 xl:py-1 xl:text-sm 2xl:text-xs text-right font-bold pr-3'>
        {convertedStock.toFixed(2)}
      </TableCell>

      {/* UM (Select compact) */}
      <TableCell className='p-0 xl:py-1'>
        <Select value={selectedUnit} onValueChange={handleUnitChange}>
          <SelectTrigger className='w-[65px] h-6 text-[10px] px-1 2xl:w-[100px] lg:h-8 lg:p-2 xl:text-sm 2xl:text-xs cursor-pointer'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allUnits.map((u) => (
              <SelectItem
                key={u.unitName}
                value={u.unitName}
                className='text-xs lg:text-sm'
              >
                {u.unitName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* COD BARE */}
      <TableCell className='text-[10px] p-0  xl:py-1 xl:text-sm 2xl:text-xs   font-mono text-muted-foreground'>
        {item.barCode || '-'}
      </TableCell>

      {/* ACȚIUNI */}
      <TableCell className='p-0  xl:py-1'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-6 px-2 lg:h-9 lg:px-4'
            >
              <MoreHorizontal className='w-4 h-4 lg:hidden' />

              <span className='hidden lg:inline text-xs '>Acțiuni</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              className='cursor-pointer hover:bg-muted/50 text-xs lg:text-sm'
              onSelect={() =>
                router.push(`/catalog-produse/${item._id}/${toSlug(item.name)}`)
              }
            >
              Vizualizează
            </DropdownMenuItem>
            {canManageProducts && (
              <DropdownMenuItem
                className='cursor-pointer hover:bg-muted/50 text-xs lg:text-sm'
                onSelect={() =>
                  router.push(`/admin/management/products/${item._id}/edit`)
                }
              >
                Editează
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem
                className='cursor-pointer hover:bg-muted/50 text-xs lg:text-sm text-red-600 focus:text-red-600'
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
