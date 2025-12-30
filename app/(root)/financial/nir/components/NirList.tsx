'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  MoreHorizontal,
  Loader2,
  Printer,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import Link from 'next/link'
import { NirStatusBadge } from './NirStatusBadge'
import { NirFilters, NirFiltersState } from './NirFilters'
import { NirDTO } from '@/lib/db/modules/financial/nir/nir.types'
import { getNirs } from '@/lib/db/modules/financial/nir/nir.actions'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'

interface NirListProps {
  initialData: {
    data: NirDTO[]
    totalPages: number
  }
  currentPage: number
}

export function NirList({ initialData, currentPage }: NirListProps) {
  const router = useRouter()
  const [data, setData] = useState<NirDTO[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(currentPage)
  const [filters, setFilters] = useState<NirFiltersState>({})
  const debouncedFilters = useDebounce(filters, 500)
  const [isPending, startTransition] = useTransition()

  // Fetch date la schimbare filtre/pagină
  useEffect(() => {
    const fetchData = () => {
      startTransition(async () => {
        try {
          const result = await getNirs(page, debouncedFilters)
          setData(result.data)
          setTotalPages(result.totalPages)
        } catch (error) {
          console.error('Failed to fetch NIRs:', error)
          toast.error('Nu s-au putut încărca NIR-urile.')
        }
      })
    }
    fetchData()
  }, [debouncedFilters, page])

  const handleFiltersChange = (newFilters: Partial<NirFiltersState>) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  // Placeholder Print
  const handlePrintPdf = (nirId: string) => {
    toast.info('Funcționalitatea PDF va fi disponibilă în curând.')
  }

  return (
    <div className='flex flex-col gap-2'>
      <NirFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isPending={isPending}
      />

      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>NIR</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Recepție</TableHead>
              <TableHead>Gestiune</TableHead>
              <TableHead className='text-right'>Total (RON)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center h-24'>
                  <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                </TableCell>
              </TableRow>
            ) : data.length > 0 ? (
              data.map((nir) => (
                <TableRow key={nir._id} className='hover:bg-muted/50'>
                  {/* Coloana 1: NIR */}
                  <TableCell className='font-medium'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handlePrintPdf(nir._id)}
                        title='Printează'
                      >
                        <FileText className='h-4 w-4' />
                      </Button>
                      <Link
                        href={`/admin/management/reception/nir/${nir._id}`}
                        className='hover:underline  underline-offset-4'
                      >
                        {nir.nirNumber}
                      </Link>
                    </div>
                  </TableCell>

                  {/* Coloana 2: Data */}
                  <TableCell>
                    {format(new Date(nir.nirDate), 'dd.MM.yyyy')}
                  </TableCell>

                  {/* Coloana 3: Furnizor */}
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='font-medium'>
                        {nir.supplierSnapshot.name}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {nir.supplierSnapshot.cui}
                      </span>
                    </div>
                  </TableCell>

                  {/* Coloana 4: Recepție Link */}
                  <TableCell>
                    <Button
                      variant='link'
                      size='sm'
                      className='h-auto p-0 text-muted-foreground'
                      asChild
                    >
                      <Link
                        href={`/admin/management/reception/${nir.receptionId}`}
                      >
                        Recepție <ExternalLink className='ml-1 h-3 w-3' />
                      </Link>
                    </Button>
                  </TableCell>

                  {/* Coloana 5: Gestiune (Mapată) */}
                  <TableCell>
                    {LOCATION_NAMES_MAP[
                      nir.destinationLocation as keyof typeof LOCATION_NAMES_MAP
                    ] || nir.destinationLocation}
                  </TableCell>

                  {/* Coloana 6: Total */}
                  <TableCell className='text-right font-mono font-medium'>
                    {formatCurrency(nir.totals.grandTotal)}
                  </TableCell>

                  {/* Coloana 7: Status */}
                  <TableCell>
                    <NirStatusBadge status={nir.status} />
                  </TableCell>

                  {/* Coloana 8: Acțiuni */}
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() =>
                            router.push(
                              `/admin/management/reception/nir/${nir._id}`
                            )
                          }
                        >
                          Vizualizează Detalii
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() => handlePrintPdf(nir._id)}
                        >
                          <Printer className='mr-2 h-4 w-4' /> Printează PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-center h-24 text-muted-foreground'
                >
                  Nu s-au găsit NIR-uri.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
