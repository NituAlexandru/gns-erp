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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type CatalogShape = {
  _id: string
  productCode: string
  name: string
  averagePurchasePrice: number
  defaultMarkups: AdminProductDoc['defaultMarkups']
  image: string
  barCode: string
  isPublished: boolean
}

type RowState = {
  direct: number
  fullTruck: number
  smallBiz: number
  retail: number
}

type DisplayItem = AdminProductDoc | CatalogShape | AdminProductSearchResult

export default function AdminProductsList({
  products,
  currentPage,
  totalPages,
  totalProducts,
  from,
  to,
}: {
  products: DisplayItem[]
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
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<DisplayItem | null>(
    null
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DisplayItem | null>(null)
  const [activateOpen, setActivateOpen] = useState(false)
  const [activateTarget, setActivateTarget] = useState<DisplayItem | null>(null)

  // Funcție pentru activare produs
  async function handleActivateConfirm() {
    if (!activateTarget) return
    try {
      const res = await fetch(
        `/api/admin/products/${activateTarget._id}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: true }),
        }
      )
      if (!res.ok) throw new Error('Eroare la server')
      // actualizez starea locală
      setItems((prev) =>
        prev.map((i) =>
          i._id === activateTarget._id ? { ...i, isPublished: true } : i
        )
      )
      toast.success('Produs activat cu succes!')
    } catch {
      toast.error('Nu am putut activa produsul.')
    } finally {
      setActivateOpen(false)
      setActivateTarget(null)
    }
  }
  // Funcție pentru dezactivare produs
  async function handleDeactivateConfirm() {
    if (!deactivateTarget) return
    try {
      const res = await fetch(
        `/api/admin/products/${deactivateTarget._id}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: false }),
        }
      )
      if (!res.ok) throw new Error('Eroare la server')
      setItems((prev) =>
        prev.map((i) =>
          i._id === deactivateTarget._id ? { ...i, isPublished: false } : i
        )
      )
      toast.success('Produs dezactivat cu succes!')
    } catch {
      toast.error('Nu am putut dezactiva produsul.')
    } finally {
      setDeactivateOpen(false)
      setDeactivateTarget(null)
    }
  }
  // Funcție pentru stergere produs
  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    try {
      const res = await fetch(`/api/admin/products/${deleteTarget._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Server error')
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id))
      toast.success('Produs șters definitiv!')
    } catch {
      toast.error('Eroare la ștergere.')
    } finally {
      setDeleteOpen(false)
      setDeleteTarget(null)
    }
  }

  // keep items in sync with server props
  useEffect(() => {
    setItems(products)
  }, [products])

  // reset page when query changes
  useEffect(() => {
    setPage(1)
  }, [query])

  // debounced search…
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

  //  total pages based on search vs server
  const totalPagesDisplay = searchResults
    ? Math.ceil(searchResults.length / ADMIN_PRODUCT_PAGE_SIZE)
    : totalPages

  //  only slice when it's the un-paged searchResults
  const displayList = searchResults
    ? searchResults.slice(
        (page - 1) * ADMIN_PRODUCT_PAGE_SIZE,
        page * ADMIN_PRODUCT_PAGE_SIZE
      )
    : items

  // navigation for server-fetched pages
  const fetchPage = (newPage: number) => {
    startTransition(() => {
      router.replace(`/admin/products?page=${newPage}`)
      setPage(newPage)
    })
  }
  // decide search vs server
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPagesDisplay) return
    if (searchResults) {
      setPage(newPage)
    } else {
      fetchPage(newPage)
    }
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
            {searchResults
              ? `Vezi ${(page - 1) * ADMIN_PRODUCT_PAGE_SIZE + 1}–${
                  (page - 1) * ADMIN_PRODUCT_PAGE_SIZE + displayList.length
                } din ${searchResults.length}`
              : `${from}–${to} din ${totalProducts} produse`}
          </span>
        </div>
        <Button asChild variant='default' className='justify-self-end'>
          <Link href='/admin/management/products/create'>Crează Produs</Link>
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
              Livrare <br />
              mica PJ
            </TableHead>
            <TableHead>
              Adaos Retail <br />
              PF (%)
            </TableHead>
            <TableHead>
              Retail <br />
              PF
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cod Bare</TableHead>
            <TableHead colSpan={2} className='text-center'>
              Acțiuni
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayList.map((item) => {
            const prod = item as AdminProductDoc
            const fallback: RowState = {
              direct: prod.defaultMarkups?.markupDirectDeliveryPrice ?? 0,
              fullTruck: prod.defaultMarkups?.markupFullTruckPrice ?? 0,
              smallBiz:
                prod.defaultMarkups?.markupSmallDeliveryBusinessPrice ?? 0,
              retail: prod.defaultMarkups?.markupRetailPrice ?? 0,
            }
            const rowVals = rows[prod._id] ?? fallback
            const base = prod.averagePurchasePrice ?? 0

            const directPrice = base * (1 + rowVals.direct / 100)
            const fullTruckPrice = base * (1 + rowVals.fullTruck / 100)
            const smallBizPrice = base * (1 + rowVals.smallBiz / 100)
            const retailPrice = base * (1 + rowVals.retail / 100)

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
                    href={`/catalog-produse/${prod._id}/${toSlug(prod.name)}`}
                  >
                    {prod.name}
                  </Link>
                </TableCell>
                <TableCell>{formatCurrency(base)}</TableCell>

                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(rowVals.direct)}
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

                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(rowVals.fullTruck)}
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

                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(rowVals.smallBiz)}
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

                <TableCell className='text-right'>
                  <Input
                    type='number'
                    value={String(rowVals.retail)}
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
                <TableCell>
                  {prod.isPublished ? (
                    <span className='text-green-500'>Activ</span>
                  ) : (
                    <span className='text-red-500'>Inactiv</span>
                  )}
                </TableCell>
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
                {/* Acțiuni cell */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='sm'>
                        Acțiuni
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      {/* Vizualizează */}
                      <DropdownMenuItem
                        onSelect={() =>
                          router.push(
                            `/catalog-produse/${prod._id}/${toSlug(prod.name)}`
                          )
                        }
                      >
                        Vizualizează
                      </DropdownMenuItem>

                      {/* Editează */}
                      <DropdownMenuItem
                        onSelect={() =>
                          router.push(
                            `/admin/management/products/${prod._id}/edit`
                          )
                        }
                      >
                        Editează
                      </DropdownMenuItem>

                      {/* Activează / Dezactivează */}
                      {prod.isPublished ? (
                        <DropdownMenuItem
                          onSelect={() => {
                            setDeactivateTarget(prod)
                            setDeactivateOpen(true)
                          }}
                        >
                          Dezactivează
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => {
                            setActivateTarget(prod)
                            setActivateOpen(true)
                          }}
                        >
                          Activează
                        </DropdownMenuItem>
                      )}

                      {/* Șterge definitiv */}
                      <DropdownMenuItem
                        onSelect={() => {
                          setDeleteTarget(prod)
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
          })}
        </TableBody>
      </Table>

      {/* Activare produs dialog */}
      {activateTarget && (
        <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmare Activare</AlertDialogTitle>
              <AlertDialogDescription>
                Produsul “<strong>{activateTarget.name}</strong>” va fi vizibil
                clienților. Sigur dorești să continui?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <Button onClick={handleActivateConfirm}>Activează</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Dezactivare produs dialog */}
      {deactivateTarget && (
        <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmare Dezactivare</AlertDialogTitle>
              <AlertDialogDescription>
                Produsul “<strong>{deactivateTarget.name}</strong>” va fi ascuns
                clienților. Sigur dorești să continui?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <Button onClick={handleDeactivateConfirm}>Dezactivează</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Șterge definitiv dialog */}
      {deleteTarget && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Confirmare Ștergere Definitivă
              </AlertDialogTitle>
              <AlertDialogDescription>
                Produsul “<strong>{deleteTarget.name}</strong>” va fi șters
                definitiv din baza de date. Această acțiune nu poate fi anulată.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <Button variant='destructive' onClick={handleDeleteConfirm}>
                Șterge definitiv
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* PAGINAȚIE */}
      {totalPagesDisplay > 1 && (
        <div className='flex justify-center items-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => changePage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft /> Anterior
          </Button>
          <span>
            Pagina {page} din {totalPagesDisplay}
          </span>
          <Button
            variant='outline'
            onClick={() => changePage(page + 1)}
            disabled={page >= totalPagesDisplay}
          >
            Următor <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
