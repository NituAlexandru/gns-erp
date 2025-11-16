'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  getProductStatsForClient,
  ClientProductStat,
} from '@/lib/db/modules/client/summary/client-product-stats.actions'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface ClientProductsListProps {
  clientId: string
}

export function ClientProductsList({ clientId }: ClientProductsListProps) {
  const [products, setProducts] = useState<ClientProductStat[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchProducts = () => {
      startTransition(async () => {
        try {
          const result = await getProductStatsForClient(clientId, page)
          if (result.success) {
            setProducts(result.data || [])
            setTotalPages(result.totalPages || 0)
          } else {
            toast.error('Eroare statistici', { description: result.message })
            setProducts([])
            setTotalPages(0)
          }
        } catch (error) {
          console.error('Failed to fetch client product stats:', error)
          setProducts([])
          setTotalPages(0)
        }
      })
    }
    fetchProducts()
  }, [clientId, page])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
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
    <div className='flex flex-col gap-4'>
      <div className='border rounded-lg overflow-x-auto bg-card'>
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
                  {/*  Afișăm text simplu --- */}
                  <TableCell>{formatItemType(product.itemType)}</TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(product.totalValue)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className='text-center h-24'>
                  Nicio statistică de produs găsită (fără facturi finalizate).
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
