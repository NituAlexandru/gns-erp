'use client'

import React, { useEffect, useState, useCallback, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { ICatalogItem, ICatalogPage } from '@/lib/db/modules/catalog/types'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { toSlug } from '@/lib/utils'
import { CatalogRow } from './catalog-row'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'

// Trebuie să primești categoriile ca prop
interface CategoryOption {
  _id: string
  name: string
  mainCategory?: string | { _id: string }
}

interface Props {
  initialData: ICatalogPage
  currentPage: number
  canManageProducts: boolean
  isAdmin: boolean
  allCategories: CategoryOption[]
}

export default function CatalogList({
  initialData,
  currentPage,
  canManageProducts,
  isAdmin,
  allCategories,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // --- STATE ---
  const [query, setQuery] = useState(searchParams.get('q') || '')

  // Categorii
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

  const [page, setPage] = useState(() => {
    const paramPage = searchParams.get('page')
    return paramPage ? Number(paramPage) : currentPage
  })

  // Datele vin direct din server props
  const [items, setItems] = useState<ICatalogItem[]>(initialData.data)
  const [, startTransition] = useTransition()
  const [isPending, setIsPending] = useState(false)
  const [jumpInputValue, setJumpInputValue] = useState(page.toString())

  const [scanning, setScanning] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ICatalogItem | null>(null)

  // Filtrări categorii pt dropdowns
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

  // --- URL UPDATE ---
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

  useEffect(() => {
    setJumpInputValue(page.toString())
  }, [page])

  // --- SYNC DATA ---
  useEffect(() => {
    setItems(initialData.data)
  }, [initialData.data])

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const t = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (query === currentQ) return

      updateUrl({ q: query, page: 1 })
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [query, updateUrl, searchParams])

  // --- HANDLERS ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setPage(1)
  }

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

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= initialData.totalPages &&
      pageNum !== page
    ) {
      changePage(pageNum)
    } else {
      setJumpInputValue(page.toString())
    }
  }
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > initialData.totalPages) return
    setIsPending(true)
    setPage(newPage)
    updateUrl({ page: newPage })
    setIsPending(false)
  }

  return (
    <div className='flex flex-col min-h-[calc(100vh-11rem)] w-full'>
      {/* HEADER: Layout identic cu Admin */}
      <div className='grid mb-2 grid-cols-1 gap-4 lg:grid-cols-4 items-center shrink-0'>
        <h1 className='text-2xl font-bold'>Catalog Produse</h1>

        {/* ZONA CENTRALĂ: Selecturi + Search */}
        <div className='lg:col-span-2 flex flex-wrap items-center justify-center lg:justify-start gap-2'>
          {/* Select Categorie */}
          <Select
            value={selectedMainCat || 'ALL'}
            onValueChange={handleMainCatChange}
          >
            <SelectTrigger className='w-full lg:w-32'>
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

          {/* Select Sub-Categorie */}
          <Select
            value={selectedSubCat || 'ALL'}
            onValueChange={handleSubCatChange}
            disabled={!selectedMainCat}
          >
            <SelectTrigger className='w-full lg:w-32'>
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

          {/* Input Search */}
          <Input
            value={query}
            onChange={handleSearchChange}
            placeholder='Caută produs, cod, furnizor...'
            className='w-full lg:w-56'
          />

          <span className='text-sm text-gray-400 whitespace-nowrap hidden xl:block'>
            {initialData.from}–{initialData.to} din {initialData.total}
          </span>
        </div>

        {/* BUTOANE DREAPTA */}
        <div className='flex justify-self-end gap-2'>
          <Button variant='outline' onClick={() => setScanning((x) => !x)}>
            {scanning ? 'Anulează' : 'Scanează cod'}
          </Button>
          {canManageProducts && (
            <Button asChild variant='default'>
              <Link href='/admin/management/products/create'>
                Crează Produs
              </Link>
            </Button>
          )}
        </div>
      </div>
      {scanning && (
        <div className='shrink-0 mb-4'>
          <BarcodeScanner
            onDecode={async (code) => {
              setScanning(false)
              try {
                setQuery(code)
                updateUrl({ q: code, page: 1 })
                toast.success(`Căutăm produsul: ${code}`)
              } catch {
                toast.error('Eroare la scanare')
              }
            }}
            onError={() => setScanning(false)}
            onClose={() => setScanning(false)}
          />
        </div>
      )}
      {/* TABEL WRAPPER */}
      <div className='flex-1 overflow-x-auto border rounded-md relative bg-background'>
        <Table className='min-h-full w-full'>
          <TableHeader className='sticky top-0 bg-background z-10 shadow-sm'>
            <TableRow className='bg-muted'>
              {/* COD */}
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm'>
                Cod
              </TableHead>
              {/* IMAGINE */}
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm'>
                Imagine
              </TableHead>
              {/* PRODUS */}
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm'>
                Produs
              </TableHead>
              {/* CATEGORIE */}
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm'>
                Categorie
              </TableHead>

              {/* PREȚURI - Multi-line header */}
              <TableHead className='h-8 px-0 text-[10px] leading-3 lg:h-10 lg:px-2 lg:text-sm lg:leading-normal text-right'>
                Livrare
                <br />
                Directă
              </TableHead>
              <TableHead className='h-8 px-0 text-[10px] leading-3 lg:h-10 lg:px-2 lg:text-sm lg:leading-normal text-right'>
                Macara / Tir
                <br />
                Complete
              </TableHead>
              <TableHead className='h-8 px-0 text-[10px] leading-3 lg:h-10 lg:px-2 lg:text-sm lg:leading-normal text-right'>
                Comenzi
                <br />
                mici PJ
              </TableHead>
              <TableHead className='h-8 px-0 text-[10px] leading-3 lg:h-10 lg:px-2 lg:text-sm lg:leading-normal text-right'>
                Retail
                <br />
                PF
              </TableHead>

              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm text-right'>
                Stoc
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm text-center'>
                UM
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm'>
                Cod Bare
              </TableHead>
              <TableHead className='h-8 px-1 text-[10px] lg:h-10 lg:px-2 lg:text-sm'>
                Acțiuni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <CatalogRow
                key={item._id}
                item={item}
                canManageProducts={canManageProducts}
                isAdmin={isAdmin}
                setDeleteTarget={setDeleteTarget}
                setDeleteOpen={setDeleteOpen}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {/* DIALOG STERGERE */}
      {deleteTarget && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
              <AlertDialogDescription>
                Produsul “<strong>{deleteTarget.name}</strong>” nu va mai fi
                vizibil. Sigur dorești să continui?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <Button
                variant='destructive'
                onClick={async () => {
                  const res = await fetch(
                    `/api/catalog/${deleteTarget._id}/publish`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isPublished: false }),
                    },
                  )
                  if (!res.ok) {
                    toast.error('Eroare la server')
                  } else {
                    setItems((prev) =>
                      prev.filter((i) => i._id !== deleteTarget._id),
                    )
                    toast.success('Produs șters cu succes!')
                    setDeleteOpen(false)
                  }
                }}
              >
                Confirmă Ștergerea
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* PAGINAȚIE */}
      {initialData.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-1 border-t bg-background shrink-0 mt-2'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => changePage(1)}
            disabled={page <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => changePage(page - 1)}
            disabled={page <= 1 || isPending}
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
            <span>din {initialData.totalPages}</span>
          </div>

          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => changePage(page + 1)}
            disabled={page >= initialData.totalPages || isPending}
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
            onClick={() => changePage(initialData.totalPages)}
            disabled={page >= initialData.totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
