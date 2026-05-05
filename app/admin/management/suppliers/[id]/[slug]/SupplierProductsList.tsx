'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { SupplierProductStat } from '@/lib/db/modules/suppliers/summary/supplier-product-stats.actions'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SupplierProductsListProps {
  supplierId: string
  initialData: {
    data: SupplierProductStat[]
    totalPages: number
    totalSum?: number
  }
  currentPage: number
}

export function SupplierProductsList({
  supplierId,
  initialData,
  currentPage,
}: SupplierProductsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())
  const products = initialData?.data || []
  const totalPages = initialData?.totalPages || 0
  const totalSum = initialData?.totalSum || 0

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== currentPage
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
    }
  }

  return (
    <div className='flex flex-col flex-1 gap-4 min-h-[calc(100vh-30rem)] w-full h-full'>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card flex flex-col'>
        <div className='flex items-center justify-between px-1'>
          <span className='text-xs font-bold text-muted-foreground uppercase'>
            Total Achiziții Produse:
          </span>
          <span className='text-lg font-bold text-primary'>
            {formatCurrency(totalSum)}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nume Articol</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead className='text-right'>
                Valoare Achiziție (RON)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={3} className='text-center h-24'>
                  Se încarcă statisticile...
                </TableCell>
              </TableRow>
            ) : products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product._id} className='hover:bg-muted/50'>
                  <TableCell className='font-medium'>
                    {product.productName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.itemType === 'Ambalaj' ? 'outline' : 'default'
                      }
                    >
                      {product.itemType}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(product.totalValue)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className='text-center h-24'>
                  Nu există date.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-1 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin mr-1' />
            ) : (
              <ChevronLeft className='h-4 w-4 mr-1' />
            )}
            Anterior
          </Button>
          <div className='flex items-center gap-2 text-sm text-muted-foreground mx-2'>
            <span>Pagina</span>
            <Input
              value={jumpInputValue}
              onChange={(e) => setJumpInputValue(e.target.value)}
              onBlur={handleJump}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              className='w-10 h-8 text-center px-1'
              disabled={isPending}
            />
            <span>din {totalPages}</span>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin ml-1' />
            ) : (
              <ChevronRight className='h-4 w-4 ml-1' />
            )}
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
