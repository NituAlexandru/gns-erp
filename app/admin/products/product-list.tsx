'use client'

import React, { useEffect, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AdminProductSearchResult } from '@/lib/db/modules/product/types'
import { updateProductMarkup } from '@/lib/db/modules/product/product.actions'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'
import { ProductRow } from './product-row'
import { IAdminCatalogItem } from '@/lib/db/modules/catalog/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CategoryOption {
  _id: string
  name: string
  mainCategory?: string | { _id: string }
}

type RowState = {
  direct: number
  fullTruck: number
  smallBiz: number
  retail: number
}

export default function AdminProductsList({
  products,
  currentPage,
  totalPages,
  totalProducts,
  from,
  to,
  allCategories,
}: {
  products: IAdminCatalogItem[]
  currentPage: number
  totalPages: number
  totalProducts: number
  from: number
  to: number
  allCategories: CategoryOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [page, setPage] = useState(() => {
    const paramPage = searchParams.get('page')
    return paramPage ? Number(paramPage) : currentPage
  })
  const [items, setItems] = useState<IAdminCatalogItem[]>(products)

  const updateUrl = useCallback(
    (paramsUpdate: { q?: string; category?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString())
      const updateParam = (key: string, val?: string | number) => {
        if (val && val !== '') params.set(key, String(val))
        else params.delete(key)
      }

      if (paramsUpdate.q !== undefined) updateParam('q', paramsUpdate.q)
      if (paramsUpdate.category !== undefined)
        updateParam('category', paramsUpdate.category)
      if (paramsUpdate.page !== undefined)
        updateParam('page', paramsUpdate.page)

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  const [searchResults, setSearchResults] = useState<
    IAdminCatalogItem[] | null
  >(null)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] =
    useState<IAdminCatalogItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<IAdminCatalogItem | null>(
    null,
  )
  const [activateOpen, setActivateOpen] = useState(false)
  const [activateTarget, setActivateTarget] =
    useState<IAdminCatalogItem | null>(null)
  const [scanning, setScanning] = useState(false)
  // --- STATE NOU PENTRU FILTRE ---
  const [supplierQuery, setSupplierQuery] = useState(
    searchParams.get('supplier') || '',
  )

  // Logică Categorii
  const initialCatId = searchParams.get('category') || ''
  const initialSelectedCat = allCategories.find((c) => c._id === initialCatId)
  const isInitialSub = initialSelectedCat && initialSelectedCat.mainCategory

  const [selectedMainCat, setSelectedMainCat] = useState<string>(
    isInitialSub
      ? typeof initialSelectedCat.mainCategory === 'object'
        ? initialSelectedCat.mainCategory._id
        : (initialSelectedCat.mainCategory as string)
      : initialSelectedCat
        ? initialCatId
        : '',
  )
  const [selectedSubCat, setSelectedSubCat] = useState<string>(
    isInitialSub ? initialCatId : '',
  )

  // Filtrări liste categorii
  const mainCategories = allCategories.filter((c) => !c.mainCategory)
  const subCategories = selectedMainCat
    ? allCategories.filter((c) => {
        const pId =
          typeof c.mainCategory === 'object'
            ? c.mainCategory?._id
            : c.mainCategory
        return pId === selectedMainCat
      })
    : []

  async function handleActivateConfirm() {
    if (!activateTarget) return
    try {
      const res = await fetch(
        `/api/admin/products/${activateTarget._id}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: true }),
        },
      )
      if (!res.ok) throw new Error('Eroare la server')
      setItems((prev) =>
        prev.map((i) =>
          i._id === activateTarget._id ? { ...i, isPublished: true } : i,
        ),
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
        },
      )
      if (!res.ok) throw new Error('Eroare la server')
      setItems((prev) =>
        prev.map((i) =>
          i._id === deactivateTarget._id ? { ...i, isPublished: false } : i,
        ),
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

  useEffect(() => {
    setItems(products)
  }, [products])

  // debounced search update URL (Server Side Filtering)
  useEffect(() => {
    const t = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (query === currentQ) return

      // Doar q și category (care e deja în URL dacă e selectată)
      updateUrl({ q: query, page: 1 })
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [query, updateUrl, searchParams])

  const totalPagesDisplay = totalPages
  const displayList = items

  const handleMainCatChange = (val: string) => {
    const newVal = val === 'ALL' ? '' : val
    setSelectedMainCat(newVal)
    setSelectedSubCat('')
    setPage(1)
    updateUrl({ category: newVal, page: 1 })
  }

  const handleSubCatChange = (val: string) => {
    const newVal = val === 'ALL' ? '' : val
    setSelectedSubCat(newVal)
    setPage(1)
    updateUrl({ category: newVal || selectedMainCat, page: 1 })
  }

  // decide search vs server
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return

    setPage(newPage)

    updateUrl({ page: newPage })
  }

  const onMarkupChange = (
    id: string,
    key: keyof RowState,
    val: number,
    fallback: RowState,
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
          item._id === id
            ? {
                ...item,
                defaultMarkups: {
                  markupDirectDeliveryPrice: row.direct,
                  markupFullTruckPrice: row.fullTruck,
                  markupSmallDeliveryBusinessPrice: row.smallBiz,
                  markupRetailPrice: row.retail,
                },
              }
            : item,
        ),
      )
    } else {
      toast.error('Eroare la salvare: ' + res.message)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setPage(1)
  }

  return (
    <div className='flex flex-col h-[calc(100vh-6rem)] w-full p-0'>
      {/* HEADER */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-5 items-center shrink-0 mb-2'>
        <h1 className='text-xs lg:text-2xl font-bold'>Marja profit</h1>
        <div className='lg:col-span-3 flex flex-wrap items-center justify-center gap-2'>
          {/* 2. Select Categorie */}
          <Select
            value={selectedMainCat || 'ALL'}
            onValueChange={handleMainCatChange}
          >
            <SelectTrigger className='w-full lg:w-36 xl-40 2xl-48'>
              <SelectValue placeholder='Cat.' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>Toate</SelectItem>
              {mainCategories.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 3. Select Sub-Categorie */}
          <Select
            value={selectedSubCat || 'ALL'}
            onValueChange={handleSubCatChange}
            disabled={!selectedMainCat}
          >
            <SelectTrigger className='w-full lg:w-36 xl-40 2xl-48'>
              <SelectValue placeholder='Sub.' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>Toate</SelectItem>
              {subCategories.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 1. UNICUL INPUT (Caută Produs + Furnizor) */}
          <Input
            value={query}
            onChange={handleSearchChange}
            placeholder='Caută produs, cod, furnizor...'
            className='w-full lg:w-44 xl:w-64 2xl:w-80'
          />

          <span className='text-sm text-gray-400 whitespace-nowrap'>
            {from}–{to} din {totalProducts}
          </span>
        </div>
        <div className='flex justify-self-end gap-1'>
          <Button
            variant='outline'
            onClick={() => setScanning((x) => !x)}
            className='h-8 text-xs px-2 2xl:h-10 lg:text-sm 2xl:px-4'
          >
            {scanning ? 'Anulează' : 'Scanează'}
          </Button>
          <Button
            asChild
            variant='default'
            className='h-8 text-xs px-2 2xl:h-10 lg:text-sm 2xl:px-4'
          >
            <Link href='/admin/management/products/create'>Crează Produs</Link>
          </Button>
        </div>
      </div>

      {scanning && (
        <BarcodeScanner
          onDecode={async (code) => {
            setScanning(false)
            try {
              // Căutăm în API-ul de admin
              const res = await fetch(
                `/api/admin/products/search?q=${encodeURIComponent(code)}`,
              )
              if (!res.ok) throw new Error('Produs inexistent')
              const items = (await res.json()) as AdminProductSearchResult[]

              // Găsim produsul scanat
              const match = items.find((p) => p.barCode === code) || items[0]

              if (!match) {
                toast.error(`Produs cu cod „${code}” nu a fost găsit.`)
                return
              }

              // MODIFICARE CHEIE: Redirect la pagina de EDITARE
              router.push(`/admin/management/products/${match._id}/edit`)
            } catch {
              toast.error('Eroare la căutarea produsului')
            }
          }}
          onError={() => setScanning(false)}
          onClose={() => setScanning(false)}
        />
      )}
      <div className='flex-1 overflow-auto border rounded-md relative bg-background'>
        <Table className='min-h-full w-full'>
          <TableHeader className='sticky top-0 bg-background z-20 shadow-sm'>
            <TableRow className='bg-muted hover:bg-muted'>
              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm'>
                Cod
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm'>
                Imagine
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm'>
                Produs
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm whitespace-nowrap'>
                Preț Intrare
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm'>
                UM
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm text-right'>
                Stoc
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm 2xl:leading-normal text-right'>
                Adaos Livrare <br /> Directă (%)
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm 2xl:leading-normal text-left'>
                Livrare <br /> Directă
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm 2xl:leading-normal text-right'>
                Adaos Macara / <br /> Tir Complete (%)
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm 2xl:leading-normal text-left'>
                Macara / Tir <br /> Complete
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-0 2xl:px-2 2xl:text-sm 2xl:leading-normal text-right'>
                Adaos Livrare <br /> mica PJ (%)
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-4 2xl:text-sm 2xl:leading-normal text-left'>
                Livrare <br /> mica PJ
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-4 2xl:text-sm 2xl:leading-normal text-right'>
                Adaos Retail <br /> PF (%)
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] leading-3 2xl:h-10 2xl:p-4 2xl:text-sm 2xl:leading-normal text-left'>
                Retail <br /> PF
              </TableHead>

              <TableHead className='h-8 px-1 text-[10px] 2xl:h-10 2xl:p-4 2xl:text-sm'>
                Status
              </TableHead>
              <TableHead
                colSpan={2}
                className='h-8 px-1 text-[10px] text-center 2xl:h-10 2xl:p-4 2xl:text-sm'
              >
                Acțiuni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayList.map((item) => (
              <ProductRow
                key={item._id}
                item={item}
                onMarkupChange={onMarkupChange}
                onUpdate={onUpdate}
                dirtyRows={dirtyRows}
                rows={rows}
                setDeactivateTarget={setDeactivateTarget}
                setDeactivateOpen={setDeactivateOpen}
                setActivateTarget={setActivateTarget}
                setActivateOpen={setActivateOpen}
                setDeleteTarget={setDeleteTarget}
                setDeleteOpen={setDeleteOpen}
              />
            ))}
          </TableBody>
        </Table>
      </div>
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
                agenților. Sigur dorești să continui?
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
        <div className='flex justify-center items-center gap-2 mt-4 shrink-0'>
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
