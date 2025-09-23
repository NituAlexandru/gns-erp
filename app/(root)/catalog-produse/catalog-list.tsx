'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { ICatalogPage, ICatalogItem } from '@/lib/db/modules/catalog/types'
import Link from 'next/link'
import { PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'
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
import { toast } from 'sonner'
import { toSlug } from '@/lib/utils'
import { CatalogRow } from './catalog-row'

interface Props {
  initialData: ICatalogPage
  currentPage: number
  canManageProducts: boolean
  isAdmin: boolean
}

export default function CatalogList({
  initialData,
  currentPage,
  canManageProducts,
  isAdmin,
}: Props) {
  const [page, setPage] = useState(currentPage)
  const [items, setItems] = useState<ICatalogItem[]>(initialData.data)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ICatalogItem[] | null>(
    null
  )
  const [scanning, setScanning] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ICatalogItem | null>(null)

  useEffect(() => {
    setItems(initialData.data)
  }, [initialData.data])

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchQuery.trim()
      if (!q) {
        setSearchResults(null)
        return
      }
      try {
        const res = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(q)}`
        )
        if (!res.ok) {
          setSearchResults([])
        } else {
          const data = (await res.json()) as ICatalogItem[]
          setSearchResults(Array.isArray(data) ? data : [])
        }
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const totalPagesDisplay = searchResults
    ? Math.ceil(searchResults.length / PRODUCT_PAGE_SIZE)
    : initialData.totalPages

  const displayList = searchResults
    ? searchResults.slice(
        (page - 1) * PRODUCT_PAGE_SIZE,
        page * PRODUCT_PAGE_SIZE
      )
    : items

  const fetchPage = (newPage = 1) => {
    startTransition(() => {
      router.replace(`/catalog-produse?page=${newPage}`)
      setPage(newPage)
    })
  }

  return (
    <div className='p-0 max-w-full'>
      <div className='grid mb-4 grid-cols-1 items-center gap-4 lg:grid-cols-4 lg:items-center w-full'>
        <h1 className='text-2xl font-bold'>Catalog Produse</h1>
        <div className='lg:col-span-2 flex items-center space-x-2 justify-center'>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Caută după cod, nume sau cod de bare'
            className='w-full lg:w-80 h-10 px-4 text-sm sm:text-base rounded-md border
                      focus:outline-none focus:ring bg-background hover:bg-accent
                      hover:text-accent-foreground dark:bg-input/30 dark:border-input
                      dark:hover:bg-input/50 justify-self-center'
          />
          <span className='text-sm text-gray-400'>
            {searchResults
              ? `Vezi ${(page - 1) * PRODUCT_PAGE_SIZE + 1} – ${
                  (page - 1) * PRODUCT_PAGE_SIZE + displayList.length
                } din ${searchResults.length}`
              : `Vezi ${initialData.from}-${initialData.to} din ${initialData.total} produse`}
          </span>
        </div>

        <div className='flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto justify-self-end'>
          <Button
            variant='outline'
            className='w-full sm:w-auto'
            onClick={() => setScanning((x) => !x)}
          >
            {scanning ? 'Anulează' : 'Scanează cod'}
          </Button>
          {canManageProducts && (
            <Button asChild variant='default' className='w-full sm:w-auto'>
              <Link href='/admin/management/products/create'>
                Crează Produs
              </Link>
            </Button>
          )}
        </div>
      </div>

      {scanning && (
        <BarcodeScanner
          onDecode={async (code) => {
            setScanning(false)
            try {
              const res = await fetch(
                `/api/catalog/search?q=${encodeURIComponent(code)}`
              )
              if (!res.ok) throw new Error('Produs inexistent')
              const items = (await res.json()) as ICatalogItem[]
              const match = items.find((p) => p.barCode === code) || items[0]
              if (!match) {
                toast.error(`Produs cu cod „${code}” nu a fost găsit.`)
                return
              }
              router.push(`/catalog-produse/${match._id}/${toSlug(match.name)}`)
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Eroare la căutarea produsului'
              toast.error(message)
            }
          }}
          onError={() => setScanning(false)}
          onClose={() => setScanning(false)}
        />
      )}

      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>Cod</TableHead>
              <TableHead>Imagine</TableHead>
              <TableHead>Produs</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>
                Livrare
                <br />
                Directă
              </TableHead>
              <TableHead>
                Macara / Tir
                <br />
                Complete
              </TableHead>
              <TableHead>
                Comenzi
                <br />
                mici PJ
              </TableHead>
              <TableHead>
                Retail
                <br />
                PF
              </TableHead>
              <TableHead>Stoc</TableHead>
              <TableHead>UM</TableHead>
              <TableHead>Cod Bare</TableHead>
              <TableHead>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayList.map((item) => (
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
                      }
                    )
                    if (!res.ok) {
                      toast.error('Eroare la server')
                    } else {
                      setItems((prev) =>
                        prev.filter((i) => i._id !== deleteTarget._id)
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

        {totalPagesDisplay > 1 && (
          <div className='flex justify-center items-center gap-2 mt-4'>
            <Button
              variant='outline'
              onClick={() => {
                const np = page - 1
                if (searchResults) setPage(np)
                else fetchPage(np)
              }}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span>
              Pagina {page} din {totalPagesDisplay}
            </span>
            <Button
              variant='outline'
              onClick={() => {
                const np = page + 1
                if (searchResults) setPage(np)
                else fetchPage(np)
              }}
              disabled={page >= totalPagesDisplay}
            >
              Următor
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
