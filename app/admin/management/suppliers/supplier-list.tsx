'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import DeleteDialog from '@/components/shared/delete-dialog'
import { formatError, formatId, toSlug } from '@/lib/utils'
import { toast } from 'sonner'
import { ISupplierDoc } from '@/lib/db/modules/suppliers'
import LoadingPage from '@/app/loading'
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'

interface Props {
  initialData: {
    data: ISupplierDoc[]
    totalPages: number
    total: number
    from: number
    to: number
  }
  currentPage: number
}

export default function SupplierList({ initialData, currentPage }: Props) {
  const [page, setPage] = useState(currentPage)
  const [isPending, startTransition] = useTransition()
  const [scanning, setScanning] = useState(false)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ISupplierDoc[] | null>(
    null
  )

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  // câte pagini avem în total
  const totalPagesDisplay = searchResults
    ? Math.ceil(searchResults.length / ADMIN_PAGE_SIZE)
    : initialData.totalPages

  // lista efectivă pe care o mapezi în tabel
  const displayList = searchResults
    ? searchResults.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE)
    : initialData.data
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchQuery.trim()
      if (!q) {
        setSearchResults(null)
        return
      }
      try {
        const res = await fetch(
          `/api/admin/management/suppliers/search?q=${encodeURIComponent(q)}`
        )
        if (!res.ok) {
          setSearchResults([])
        } else {
          const data = (await res.json()) as ISupplierDoc[]
          setSearchResults(Array.isArray(data) ? data : [])
        }
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchPage = (newPage = 1) => {
    startTransition(() => {
      router.replace(`/admin/management/suppliers?page=${newPage}`)
      setPage(newPage)
    })
  }

  const handleDeleteAction = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/management/suppliers/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        return { success: false, message: json.message }
      }
      toast.success('Furnizor șters cu succes.')
      return { success: true, message: 'Furnizor șters cu succes.' }
    } catch (err) {
      return { success: false, message: formatError(err) }
    }
  }

  return (
    <div className='p-6 space-y-4 mx-auto pt-0'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Furnizori</h1>
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Caută după nume sau cod fiscal'
          className='h-9 w-90 px-4 py-2 text-sm font-medium rounded-md border border-slate-700 bg-transparenttext-white hover:bg-white/10 focus:outline-none focus:bg-white/10'
        />
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => setScanning(true)}>
            {scanning ? 'Anulează căutarea' : 'Scanează cod furnizor'}
          </Button>
          <Button asChild variant='default'>
            <Link href='/admin/management/suppliers/new'>Adaugă furnizor</Link>
          </Button>
        </div>
      </div>
      {scanning && (
        <BarcodeScanner
          onDecode={(code) => {
            setScanning(false)
            router.push(`/admin/management/suppliers/${code}/${toSlug(code)}`)
          }}
          onError={() => {
            toast.error('Failed to start camera')
            setScanning(false)
          }}
          onClose={() => setScanning(false)}
        />
      )}
      {isPending ? (
        <LoadingPage />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Cod Fiscal</TableHead>
                <TableHead>Nr. Reg. Com.</TableHead>
                <TableHead className='break-words whitespace-normal'>
                  Platitor de TVA
                </TableHead>
                <TableHead className='w-48'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayList.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{formatId(s._id)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/management/suppliers/${s._id}/${toSlug(s.name)}`}
                      className='hover:underline'
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.fiscalCode}</TableCell>
                  <TableCell>{s.regComNumber}</TableCell>
                  <TableCell>
                    {s.isVatPayer ? (
                      <span className='text-green-600 font-semibold'>DA</span>
                    ) : (
                      <span className='text-red-600 font-semibold'>NU</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* inline buttons doar de la xl în sus */}
                    <div className='hidden xl:flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          startTransition(() =>
                            router.push(
                              `/admin/management/suppliers/${s._id}/${toSlug(s.name)}`
                            )
                          )
                        }
                      >
                        Vizualizează
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          startTransition(() =>
                            router.push(`/admin/management/suppliers/${s._id}`)
                          )
                        }
                      >
                        Editează
                      </Button>
                      <DeleteDialog
                        id={s._id}
                        action={handleDeleteAction}
                        callbackAction={() => fetchPage(page)}
                      />
                    </div>
                    {/* sub xl: un singur buton care deschide dropdown */}
                    <div className='flex xl:hidden'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='outline' size='sm'>
                            Acțiuni
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onSelect={() =>
                              router.push(
                                `/admin/management/suppliers/${s._id}/${toSlug(s.name)}`
                              )
                            }
                          >
                            Vizualizează
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              router.push(
                                `/admin/management/suppliers/${s._id}`
                              )
                            }
                          >
                            Editează
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={async () => {
                              if (
                                confirm(
                                  'Sigur vrei să ştergi furnizorul “' +
                                    s.name +
                                    '”?'
                                )
                              ) {
                                const res = await handleDeleteAction(s._id)
                                if (res.success) fetchPage(page)
                              }
                            }}
                          >
                            Șterge
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* ascunde butoanele de paginare când e search activ */}
          {totalPagesDisplay > 1 && (
            <div className='flex justify-center items-center gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  if (searchResults) setPage(page - 1)
                  else fetchPage(page - 1)
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
                  if (searchResults) setPage(page + 1)
                  else fetchPage(page + 1)
                }}
                disabled={page >= totalPagesDisplay}
              >
                Următor
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
