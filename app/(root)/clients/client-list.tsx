'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
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
import { formatCurrency, formatError, toSlug } from '@/lib/utils'
import { toast } from 'sonner'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { getClientByCode } from '@/lib/db/modules/client/client.actions'
import { ContractTemplateDTO } from '@/lib/db/modules/contracts/contract.types'
import { ContractActions } from '@/app/admin/contracts/contract-actions'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'

interface Props {
  data: (IClientDoc & { summary?: any })[]
  totalPages: number
  currentPage: number
  adminId: string
  addendumTemplates: ContractTemplateDTO[]
  isAdmin: boolean
}

export default function ClientList({
  data,
  totalPages,
  currentPage,
  adminId,
  addendumTemplates,
  isAdmin,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [scanning, setScanning] = useState(false)

  // Ref pentru debounce la căutare (să nu facă request la fiecare tastă)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== currentPage
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
    }
  }

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
    <div className='flex flex-col min-h-[calc(100vh-12rem)] w-full p-0 max-w-full'>
      <div className='grid mb-2 grid-cols-1 items-center gap-4 lg:grid-cols-3 lg:items-center w-full'>
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
      <div className='flex-1 border rounded-md bg-background'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead className='h-8 py-0.5'>Nume</TableHead>
              <TableHead className='h-8 py-0.5 hidden sm:table-cell'>
                Tip client
              </TableHead>
              <TableHead className='h-8 py-0.5 hidden md:table-cell'>
                Plafon Credit
              </TableHead>
              <TableHead className='h-8 py-0.5 hidden sm:table-cell'>
                CNP / CUI
              </TableHead>
              <TableHead className='h-8 py-0.5'>Email</TableHead>
              <TableHead className='h-8 py-0.5'>Telefon</TableHead>
              <TableHead className='h-8 py-0.5 hidden xl:table-cell'>
                Contract
              </TableHead>
              <TableHead className='h-8 py-0.5 w-[400px] text-right'>
                Acțiuni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='h-24 text-center text-muted-foreground'
                >
                  {searchParams.get('q')
                    ? 'Nu s-au găsit clienți pentru căutarea ta.'
                    : 'Nu există clienți în baza de date.'}
                </TableCell>
              </TableRow>
            ) : (
              data.map((c) => (
                <TableRow key={c._id} className='hover:bg-muted/50 py-0.5'>
                  <TableCell className='py-0.5'>
                    <Link
                      href={`/clients/${c._id}/${toSlug(c.name)}`}
                      className='hover:underline font-medium'
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className='py-0 hidden sm:table-cell'>
                    {c.clientType === 'Persoana fizica' ? (
                      <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200'>
                        PF
                      </span>
                    ) : (
                      <span className='px-2 py-0 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200'>
                        PJ
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='py-0 hidden md:table-cell font-medium'>
                    {c.summary && typeof c.summary.creditLimit === 'number'
                      ? formatCurrency(c.summary.creditLimit)
                      : '—'}
                  </TableCell>
                  <TableCell className='py-0 hidden sm:table-cell font-mono'>
                    {c.clientType === 'Persoana fizica'
                      ? c.cnp || '—'
                      : c.vatId || '—'}
                  </TableCell>
                  <TableCell className='py-0.5'>{c.email || '—'}</TableCell>
                  <TableCell className='py-0.5'>{c.phone || '—'}</TableCell>
                  <TableCell className='py-0 hidden xl:table-cell'>
                    {c.contractNumber ? (
                      <div className='flex flex-col text-xs'>
                        <span
                          className={
                            c.isErpCreatedContract
                              ? 'text-green-500 font-medium'
                              : 'font-medium'
                          }
                        >
                          {c.isErpCreatedContract
                            ? `GNS-${c.contractNumber}`
                            : c.contractNumber}{' '}
                          /{' '}
                          {c.contractDate
                            ? new Date(c.contractDate).toLocaleDateString(
                                'ro-RO',
                              )
                            : '-'}
                        </span>
                        {c.addendums && c.addendums.length > 0 && (
                          <span className='text-muted-foreground'>
                            + {c.addendums.length}{' '}
                            {c.addendums.length === 1
                              ? 'Act Adițional'
                              : 'Acte Adiționale'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className='text-muted-foreground italic text-xs'>
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='py-0.5'>
                    <div className='flex justify-end gap-2'>
                      {isAdmin && (
                        <ContractActions
                          clientId={c._id}
                          adminId={adminId}
                          hasActiveContract={!!c.isErpCreatedContract}
                          addendumTemplates={addendumTemplates}
                        />
                      )}

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
        <div className='flex items-center justify-center gap-2 py-3 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin mr-1' />
            ) : (
              <ChevronLeft className='h-4 w-4 mr-1' />
            )}
            Anterior
          </Button>

          {/* Zona Centrală: Sari la Pagina */}
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
            <span>din {totalPages}</span>
          </div>

          {/* Buton: Următor (>) */}
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin ml-1' />
            ) : (
              <ChevronRight className='h-4 w-4 ml-1' />
            )}
          </Button>

          {/* Buton: Ultima Pagină (>>) */}
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
