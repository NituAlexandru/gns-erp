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
import { formatError, toSlug } from '@/lib/utils'
import { toast } from 'sonner'
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
// Importăm noua acțiune pentru scanner
import { getSupplierByCode } from '@/lib/db/modules/suppliers/supplier.actions'

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [scanning, setScanning] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Datele vin direct din props (server)
  const displayList = initialData.data
  const totalPagesDisplay = initialData.totalPages

  // 1. Logică Căutare (URL)
  const handleSearch = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', '1') // Reset la pagina 1
      if (term) {
        params.set('q', term)
      } else {
        params.delete('q')
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, 400) // Debounce 400ms
  }

  // 2. Logică Paginare (URL)
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // 3. Logică Scanner (Server Action)
  const handleScan = async (code: string) => {
    setScanning(false)
    try {
      const supplier = await getSupplierByCode(code)
      if (supplier) {
        router.push(
          `/admin/management/suppliers/${supplier._id}/${toSlug(supplier.name)}`,
        )
        toast.success('Furnizor găsit!')
      } else {
        toast.error(`Furnizor cu codul „${code}” nu a fost găsit.`)
      }
    } catch {
      toast.error('Eroare la căutarea furnizorului.')
    }
  }

  // 4. Logică Ștergere (API)
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
      router.refresh() // Reîmprospătăm datele
      return { success: true, message: 'Furnizor șters cu succes.' }
    } catch (err) {
      return { success: false, message: formatError(err) }
    }
  }

  return (
    <div className='p-0 space-y-4 mx-auto max-w-full'>
      <div className='grid grid-cols-1 items-center gap-4 lg:grid-cols-3 lg:items-center w-full'>
        <h1 className='justify-self-start text-2xl font-bold'>Furnizori</h1>

        {/* Input Căutare - controlat prin URL */}
        <input
          type='text'
          defaultValue={searchParams.get('q')?.toString()}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder='Caută după nume sau cod fiscal...'
          className='w-full lg:w-80 h-10 px-4 text-sm sm:text-base rounded-md border focus:outline-none focus:ring bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-self-center'
        />

        <div className='flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto justify-self-end'>
          <Button
            className='w-full sm:w-auto'
            variant='outline'
            onClick={() => setScanning(!scanning)}
          >
            {scanning ? 'Anulează' : 'Scanează cod'}
          </Button>
          <Button className='w-full sm:w-auto' asChild variant='default'>
            <Link href='/admin/management/suppliers/new'>Adaugă furnizor</Link>
          </Button>
        </div>
      </div>

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

      <div className='overflow-x-auto border rounded-md'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>Nume</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Cod Fiscal</TableHead>
              <TableHead className='hidden sm:table-cell'>
                Nr. Reg. Com.
              </TableHead>
              <TableHead className='break-words whitespace-normal'>
                Platitor de TVA
              </TableHead>
              <TableHead className='w-48 text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-center h-24 text-muted-foreground'
                >
                  Nu s-au găsit furnizori.
                </TableCell>
              </TableRow>
            ) : (
              displayList.map((s) => (
                <TableRow key={s._id} className='hover:bg-muted/50'>
                  <TableCell>
                    <Link
                      href={`/admin/management/suppliers/${s._id}/${toSlug(s.name)}`}
                      className='hover:underline font-medium'
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.email || '—'}</TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell>{s.fiscalCode || '—'}</TableCell>
                  <TableCell className='hidden sm:table-cell'>
                    {s.regComNumber || '—'}
                  </TableCell>
                  <TableCell>
                    {s.isVatPayer ? (
                      <span className='text-green-600 font-semibold'>DA</span>
                    ) : (
                      <span className='text-red-600 font-semibold'>NU</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-2'>
                      {/* Desktop Actions */}
                      <div className='hidden xl:flex gap-2'>
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            href={`/admin/management/suppliers/${s._id}/${toSlug(s.name)}`}
                          >
                            Vizualizează
                          </Link>
                        </Button>
                        <Button variant='outline' size='sm' asChild>
                          <Link href={`/admin/management/suppliers/${s._id}`}>
                            Editează
                          </Link>
                        </Button>
                        <DeleteDialog id={s._id} action={handleDeleteAction} />
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
                                  `/admin/management/suppliers/${s._id}/${toSlug(s.name)}`,
                                )
                              }
                            >
                              Vizualizează
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(
                                  `/admin/management/suppliers/${s._id}`,
                                )
                              }
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
      {totalPagesDisplay > 1 && (
        <div className='flex justify-center items-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span>
            Pagina {currentPage} din {totalPagesDisplay}
          </span>

          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPagesDisplay || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
