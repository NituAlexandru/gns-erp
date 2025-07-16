'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency, toSlug } from '@/lib/utils'
import {
  AdminProductDoc,
  AdminProductSearchResult,
} from '@/lib/db/modules/product/types'
import { updateProductMarkup } from '@/lib/db/modules/product/product.actions'
import { ADMIN_PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'
import { toast } from 'sonner'

type RowState = {
  direct: number
  fullTruck: number
  smallBiz: number
  retail: number
}

type DisplayItem = AdminProductDoc | AdminProductSearchResult

export default function AdminProductsList({
  products,
  currentPage,
  totalPages,
  totalProducts,
  from,
  to,
}: {
  products: AdminProductDoc[]
  currentPage: number
  totalPages: number
  totalProducts: number
  from: number
  to: number
}) {
  const [page, setPage] = useState(currentPage)
  const [items, setItems] = useState<DisplayItem[]>(products)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DisplayItem[] | null>(null)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const router = useRouter()

  // Reset to first page on new search
  useEffect(() => {
    setPage(1)
  }, [query])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim()
      if (!q) {
        setSearchResults(null)
        return
      }
      try {
        const res = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(q)}`
        )
        const data = res.ok ? await res.json() : []
        setSearchResults(Array.isArray(data) ? data : [])
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const handlePage = (dir: 'prev' | 'next') => {
    const np = dir === 'next' ? page + 1 : page - 1
    if (np < 1 || np > totalPages) return
    startTransition(() => {
      if (!searchResults) router.replace(`/admin/products?page=${np}`)
      setPage(np)
    })
  }

  const onMarkupChange = (
    id: string,
    key: keyof RowState,
    val: number,
    fallback: RowState
  ) => {
    setRows((prev) => {
      const base = prev[id] ?? fallback
      return { ...prev, [id]: { ...base, [key]: val } }
    })
    setDirtyRows((prev) => ({ ...prev, [id]: true }))
  }

  const onUpdate = async (id: string) => {
    const row = rows[id]
    if (!row) return

    const res = await updateProductMarkup(id, {
      markupDirectDeliveryPrice: row.direct,
      markupFullTruckPrice: row.fullTruck,
      markupSmallDeliveryBusinessPrice: row.smallBiz,
      markupRetailPrice: row.retail,
    })

    if (res.success) {
      toast.success('Prețurile au fost actualizate cu succes!')
      setDirtyRows((prev) => {
        const c = { ...prev }
        delete c[id]
        return c
      })

      setItems((prev) =>
        prev.map((item) =>
          (item as AdminProductDoc)._id === id
            ? {
                ...(item as AdminProductDoc),
                defaultMarkups: {
                  markupDirectDeliveryPrice: row.direct,
                  markupFullTruckPrice: row.fullTruck,
                  markupSmallDeliveryBusinessPrice: row.smallBiz,
                  markupRetailPrice: row.retail,
                },
              }
            : item
        )
      )
      setRows((prev) => ({
        ...prev,
        [id]: {
          direct: row.direct,
          fullTruck: row.fullTruck,
          smallBiz: row.smallBiz,
          retail: row.retail,
        },
      }))
    } else {
      toast.error('Eroare la salvare: ' + res.message)
    }
  }

  const displayList = (searchResults ?? items).slice(
    (page - 1) * ADMIN_PRODUCT_PAGE_SIZE,
    page * ADMIN_PRODUCT_PAGE_SIZE
  )

  return (
    <div className='p-0 max-w-full'>
      {/* HEADER */}
      <div className='grid mb-4 grid-cols-1 gap-4 lg:grid-cols-4 items-center'>
        <h1 className='text-2xl font-bold'>Marja profit</h1>
        <div className='lg:col-span-2 flex items-center space-x-2 justify-center'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Caută după cod, nume sau cod de bare'
            className='w-full lg:w-80'
          />
          <span className='text-sm text-gray-400'>
            {`${from}–${to} din ${totalProducts} produse`}
          </span>
        </div>
        <Button asChild variant='default' className='justify-self-end'>
          <Link href='/admin/products/create'>Crează Produs</Link>
        </Button>
      </div>

      {/* TABEL */}
      <Table>
        <TableHeader>
          <TableRow className='bg-muted'>
            <TableHead>Cod</TableHead>
            <TableHead>Imagine</TableHead>
            <TableHead>Produs</TableHead>
            <TableHead>Preț Intrare</TableHead>
            <TableHead>
              Adaos Livrare <br />
              Directă (%)
            </TableHead>
            <TableHead>
              Livrare <br />
              Directă
            </TableHead>
            <TableHead>
              Adaos Macara / <br />
              Tir Complete (%)
            </TableHead>
            <TableHead>
              Macara / Tir <br />
              Complete
            </TableHead>
            <TableHead>
              Adaos Livrare <br />
              mica PJ (%)
            </TableHead>
            <TableHead>
              Livrare
              <br /> mica PJ
            </TableHead>
            <TableHead>
              Adaos Retail
              <br /> PF (%)
            </TableHead>
            <TableHead>
              Retail <br />
              PF
            </TableHead>
            <TableHead>Cod Bare</TableHead>
            <TableHead>Acțiune</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {displayList.map((item) => {
            const prod = item as AdminProductDoc
            // fallback valori din DB
            const fallback: RowState = {
              direct: prod.defaultMarkups?.markupDirectDeliveryPrice ?? 0,
              fullTruck: prod.defaultMarkups?.markupFullTruckPrice ?? 0,
              smallBiz:
                prod.defaultMarkups?.markupSmallDeliveryBusinessPrice ?? 0,
              retail: prod.defaultMarkups?.markupRetailPrice ?? 0,
            }
            // preluăm fie editarea locală, fie DB
            const rowVals = rows[prod._id] ?? fallback
            // calcule directe inline
            const base = prod.averagePurchasePrice ?? 0
            const directMarkup = rowVals.direct
            const fullTruckMarkup = rowVals.fullTruck
            const smallBizMarkup = rowVals.smallBiz
            const retailMarkup = rowVals.retail
            const directPrice = base * (1 + directMarkup / 100)
            const fullTruckPrice = base * (1 + fullTruckMarkup / 100)
            const smallBizPrice = base * (1 + smallBizMarkup / 100)
            const retailPrice = base * (1 + retailMarkup / 100)

            return (
              <TableRow key={prod._id} className='hover:bg-muted/50'>
                <TableCell>{prod.productCode}</TableCell>
                <TableCell className='p-0 h-10 w-12'>
                  {prod.image ? (
                    <Image
                      src={prod.image}
                      alt={prod.name}
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
                  <Link
                    href={`/admin/products/${prod._id}/${toSlug(prod.name)}`}
                  >
                    {prod.name}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(base)}</TableCell>
                {/* Adaos Direct */}
                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(directMarkup)}
                    onChange={(e) =>
                      onMarkupChange(
                        prod._id,
                        'direct',
                        Number(e.target.value),
                        fallback
                      )
                    }
                    className='w-20'
                  />
                </TableCell>
                <TableCell>{formatCurrency(directPrice)}</TableCell>
                {/* Adaos Camion */}
                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(fullTruckMarkup)}
                    onChange={(e) =>
                      onMarkupChange(
                        prod._id,
                        'fullTruck',
                        Number(e.target.value),
                        fallback
                      )
                    }
                    className='w-20'
                  />
                </TableCell>
                <TableCell>{formatCurrency(fullTruckPrice)}</TableCell>
                {/* Adaos Business */}
                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(smallBizMarkup)}
                    onChange={(e) =>
                      onMarkupChange(
                        prod._id,
                        'smallBiz',
                        Number(e.target.value),
                        fallback
                      )
                    }
                    className='w-20'
                  />
                </TableCell>
                <TableCell>{formatCurrency(smallBizPrice)}</TableCell>
                {/* Adaos Retail */}
                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(retailMarkup)}
                    onChange={(e) =>
                      onMarkupChange(
                        prod._id,
                        'retail',
                        Number(e.target.value),
                        fallback
                      )
                    }
                    className='w-20'
                  />
                </TableCell>
                <TableCell>{formatCurrency(retailPrice)}</TableCell>
                <TableCell>{prod.barCode || '-'}</TableCell>
                <TableCell>
                  <Button
                    size='sm'
                    variant={dirtyRows[prod._id] ? 'default' : 'outline'}
                    onClick={() => onUpdate(prod._id)}
                  >
                    Salvează
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* PAGINAȚIE */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => handlePage('prev')}
            disabled={page <= 1}
          >
            <ChevronLeft /> Anterior
          </Button>
          <span>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePage('next')}
            disabled={page >= totalPages}
          >
            Următor <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
