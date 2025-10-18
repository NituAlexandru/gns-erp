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
import { Input } from '@/components/ui/input'
import { formatError, toSlug } from '@/lib/utils'
import { toast } from 'sonner'
import { IClientDoc } from '@/lib/db/modules/client/types'
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
    data: IClientDoc[]
    totalPages: number
    total: number
    from: number
    to: number
  }
  currentPage: number
}

export default function ClientList({ initialData, currentPage }: Props) {
  const [page, setPage] = useState(currentPage)
  const [isPending, startTransition] = useTransition()
  const [scanning, setScanning] = useState(false)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IClientDoc[] | null>(null)

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const totalPagesDisplay = searchResults
    ? Math.ceil(searchResults.length / ADMIN_PAGE_SIZE)
    : initialData.totalPages

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
          `/api/clients/search?q=${encodeURIComponent(q)}`
        )
        if (!res.ok) {
          setSearchResults([])
        } else {
          const data = (await res.json()) as IClientDoc[]
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
      router.replace(`/clients?page=${newPage}`)
      setPage(newPage)
    })
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) return { success: false, message: json.message }
      toast.success('Client șters cu succes.')
      return { success: true, message: '' }
      //eslint-disable-next-line
    } catch (err: any) {
      return { success: false, message: formatError(err) }
    }
  }

  return (
    <div className='p-0 p-y-4 max-w-full'>
      <div className='grid mb-4 grid-cols-1 items-center gap-4 lg:grid-cols-3 lg:items-center w-full'>
        <h1 className='text-2xl font-bold'>Clienți</h1>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Caută după nume, CNP sau CUI'
          className='w-full lg:w-80 h-10 px-4 text-sm sm:text-base rounded-md border focus:outline-none focus:ring bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-self-center'
        />
        <div className='flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto justify-self-end'>
          <Button
            variant='outline'
            className='w-full sm:w-auto'
            onClick={() => setScanning((x) => !x)}
          >
            {scanning ? 'Anulează' : 'Scanează cod'}
          </Button>
          <Button asChild variant='default' className='w-full sm:w-auto'>
            <Link href='/clients/new'>Adaugă client</Link>
          </Button>
        </div>
      </div>

      {/* Scanner */}
      {scanning && (
        <BarcodeScanner
          onDecode={async (code: string) => {
            setScanning(false)
            try {
              const res = await fetch(
                `/api/clients/search?q=${encodeURIComponent(code)}`
              )
              if (!res.ok) throw new Error('Client inexistent')
              const items = (await res.json()) as IClientDoc[]
              const match =
                items.find((c) => c.cnp === code) ||
                items.find((c) => c.vatId === code) ||
                items.find((c) => c._id === code)
              if (!match) {
                toast.error(`Clientul cu codul „${code}” nu a fost găsit.`)
                return
              }
              router.push(`/clients/${match._id}/${toSlug(match.name)}`)
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : 'A apărut o eroare la căutarea clientului'
              )
            }
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
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted'>
                  <TableHead>Nume</TableHead>
                  <TableHead className='hidden sm:table-cell'>
                    Tip client
                  </TableHead>
                  <TableHead className='hidden sm:table-cell'>CNP</TableHead>
                  <TableHead className='hidden sm:table-cell'>CUI</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className='w-48'>Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map((c) => (
                  <TableRow key={c._id} className='hover:bg-muted/50'>
                    <TableCell>
                      <Link
                        href={`/clients/${c._id}/${toSlug(c.name)}`}
                        className='hover:underline'
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      {c.clientType}
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      {c.cnp || '—'}
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      {c.vatId || '—'}
                    </TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>{c.phone || '—'}</TableCell>
                    <TableCell>
                      <div className='hidden xl:flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            startTransition(() =>
                              router.push(`/clients/${c._id}/${toSlug(c.name)}`)
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
                              router.push(`/clients/${c._id}`)
                            )
                          }
                        >
                          Editează
                        </Button>
                        <DeleteDialog
                          id={c._id}
                          action={handleDelete}
                          callbackAction={() => fetchPage(page)}
                        />
                      </div>
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
                                  `/clients/${c._id}/${toSlug(c.name)}`
                                )
                              }
                            >
                              Vizualizează
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => router.push(`/clients/${c._id}`)}
                            >
                              Editează
                            </DropdownMenuItem>
                            {/* <DropdownMenuItem
                              onSelect={async () => {
                                if (
                                  confirm(
                                    `Sigur vrei să ștergi clientul “${c.name}”?`
                                  )
                                ) {
                                  const res = await handleDelete(c._id)
                                  if (res.success) fetchPage(page)
                                }
                              }}
                            >
                              Șterge
                            </DropdownMenuItem> */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginare */}
          {totalPagesDisplay > 1 && (
            <div className='py-2 sm:py-0 flex justify-center items-center gap-2 bg-background rounded-md'>
              <Button
                variant='outline'
                onClick={() =>
                  searchResults ? setPage(page - 1) : fetchPage(page - 1)
                }
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span className='text-sm'>
                Pagina {page} din {totalPagesDisplay}
              </span>
              <Button
                variant='outline'
                onClick={() =>
                  searchResults ? setPage(page + 1) : fetchPage(page + 1)
                }
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
