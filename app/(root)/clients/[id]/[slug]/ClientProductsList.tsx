'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { ClientProductStat } from '@/lib/db/modules/client/summary/client-product-stats.actions'
import { formatCurrency } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ClientProductsListProps {
  clientId: string
  initialData: {
    data: ClientProductStat[]
    totalPages: number
  }
  currentPage: number
}

export function ClientProductsList({
  clientId,
  initialData,
  currentPage,
}: ClientProductsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const products = initialData?.data || []
  const totalPages = initialData?.totalPages || 0
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

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
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const formatItemType = (itemType: ClientProductStat['itemType']): string => {
    switch (itemType) {
      case 'ERPProduct':
        return 'Produs'
      case 'Packaging':
        return 'Ambalaj'
      case 'Service':
        return 'Serviciu'
      case 'Manual':
        return 'Manual'
      default:
        return itemType
    }
  }

  return (
    <div className='flex flex-col gap-4 flex-1 min-h-[calc(100vh-30rem)] w-full'>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nume Produs</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead className='text-right'>
                Valoare Totală (fără TVA)
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
                  <TableCell>{formatItemType(product.itemType)}</TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(product.totalValue)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className='text-center h-24'>
                  Nicio statistică de produs găsită.
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
