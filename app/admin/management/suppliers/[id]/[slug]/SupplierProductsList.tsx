'use client'

import React, { useTransition } from 'react'
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

interface SupplierProductsListProps {
  supplierId: string
  initialData: {
    data: SupplierProductStat[]
    totalPages: number
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

  const products = initialData?.data || []
  const totalPages = initialData?.totalPages || 0

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='border rounded-lg overflow-x-auto bg-card'>
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
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
