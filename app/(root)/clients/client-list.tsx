'use client'

import React, { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
// Asigură-te că importul este corect către server action-ul nou adăugat
import { getClientByCode } from '@/lib/db/modules/client/client.actions'

interface Props {
  data: IClientDoc[]
  totalPages: number
  currentPage: number
}

export default function ClientList({ data, totalPages, currentPage }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [scanning, setScanning] = useState(false)

  // Ref pentru debounce la căutare (să nu facă request la fiecare tastă)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Logică Căutare (scrie în URL)
  const handleSearch = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      params.set('page', '1') // Resetăm pagina la 1 când căutăm
      if (term) {
        params.set('q', term)
      } else {
        params.delete('q')
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, 400) // Așteaptă 400ms după ce te oprești din scris
  }

  // 2. Logică Paginare (scrie în URL)
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // 3. Logică Scanner (folosind Server Action)
  const handleScan = async (code: string) => {
    setScanning(false)
    try {
      const client = await getClientByCode(code)
      if (client) {
        router.push(`/clients/${client._id}/${toSlug(client.name)}`)
        toast.success('Client găsit!')
      } else {
        toast.error(`Clientul cu codul „${code}” nu a fost găsit.`)
      }
    } catch {
      toast.error('Eroare la căutarea clientului.')
    }
  }

  // 4. Logică Ștergere (API existent)
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) return { success: false, message: json.message }

      toast.success('Client șters cu succes.')
      router.refresh() // Reîmprospătăm datele de pe server
      return { success: true, message: '' }
    } catch (err: any) {
      return { success: false, message: formatError(err) }
    }
  }

  return (
    <div className='p-0 py-4 max-w-full'>
      <div className='grid mb-4 grid-cols-1 items-center gap-4 lg:grid-cols-3 lg:items-center w-full'>
        <h1 className='text-2xl font-bold'>Clienți</h1>

        {/* Input Căutare - citim valoarea inițială din URL */}
        <Input
          defaultValue={searchParams.get('q')?.toString()}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder='Caută după nume, CNP sau CUI...'
          className='w-full lg:w-80 h-10 px-4 text-sm sm:text-base justify-self-center'
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
          onDecode={handleScan}
          onError={() => {
            toast.error('Eroare la pornirea camerei')
            setScanning(false)
          }}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Tabel */}
      <div className='overflow-x-auto border rounded-md'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>Nume</TableHead>
              <TableHead className='hidden sm:table-cell'>Tip client</TableHead>
              <TableHead className='hidden sm:table-cell'>CNP</TableHead>
              <TableHead className='hidden sm:table-cell'>CUI</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead className='w-48 text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='h-24 text-center text-muted-foreground'
                >
                  {searchParams.get('q')
                    ? 'Nu s-au găsit clienți pentru căutarea ta.'
                    : 'Nu există clienți în baza de date.'}
                </TableCell>
              </TableRow>
            ) : (
              data.map((c) => (
                <TableRow key={c._id} className='hover:bg-muted/50'>
                  <TableCell>
                    <Link
                      href={`/clients/${c._id}/${toSlug(c.name)}`}
                      className='hover:underline font-medium'
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
                    <div className='flex justify-end gap-2'>
                      {/* Desktop Actions */}
                      <div className='hidden xl:flex gap-2'>
                        <Button variant='outline' size='sm' asChild>
                          <Link href={`/clients/${c._id}/${toSlug(c.name)}`}>
                            Vizualizează
                          </Link>
                        </Button>
                        <Button variant='outline' size='sm' asChild>
                          <Link href={`/clients/${c._id}`}>Editează</Link>
                        </Button>
                        <DeleteDialog id={c._id} action={handleDelete} />
                      </div>

                      {/* Mobile Actions */}
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
                                  `/clients/${c._id}/${toSlug(c.name)}`,
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='py-4 flex justify-center items-center gap-2'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
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
