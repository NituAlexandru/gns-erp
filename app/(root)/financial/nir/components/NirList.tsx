'use client'

import { useState, useEffect, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { NirFilters } from './NirFilters'
import { NirDTO } from '@/lib/db/modules/financial/nir/nir.types'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface NirListProps {
  data: NirDTO[]
  totalPages: number
  currentPage: number
  totalSum: number
}

export function NirList({
  data,
  totalPages,
  currentPage,
  totalSum,
}: NirListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [isPending, startTransition] = useTransition()
  const [previewNir, setPreviewNir] = useState<NirDTO | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePrintPreview = async (nirId: string) => {
    setIsGeneratingPdf(nirId)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(nirId, 'NIR')

      if (result.success) {
        setPrintData(result.data)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
    } finally {
      setIsGeneratingPdf(null)
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <NirFilters />
      <div className='flex justify-start'>
        <div className='bg-muted/50 px-2 py-2 rounded-md border text-xs'>
          Total NIR-uri:{' '}
          <span className='font-bold text-xs ml-2'>
            {formatCurrency(totalSum)}
          </span>
        </div>
      </div>
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
                  <TableCell className='font-medium py-0 xl:py-1'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 hover:bg-muted'
                        onClick={() => {
                          setPreviewNir(nir)
                          handlePrintPreview(nir._id)
                        }}
                        disabled={!!isGeneratingPdf}
                        title='Printează NIR'
                      >
                        {isGeneratingPdf === nir._id ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Printer className='h-4 w-4' />
                        )}
                      </Button>
                      <Link
                        href={`/admin/management/reception/nir/${nir._id}`}
                        className='hover:underline underline-offset-4'
                      >
                        {nir.nirNumber}
                      </Link>
                    </div>
                  </TableCell>

                  {/* Coloana 2: Data */}
                  <TableCell className='py-0 xl:py-1 text-[10px] xl:text-xs'>
                    {format(new Date(nir.nirDate), 'dd.MM.yyyy')}
                  </TableCell>

                  {/* Coloana 3: Furnizor */}
                  <TableCell className='py-0 xl:py-1 text-[10px] xl:text-xs'>
                    <div className='flex flex-col'>
                      <span className='font-medium'>
                        {nir.supplierSnapshot.name}
                      </span>
                      <span className='text-[10px] xl:text-xs text-muted-foreground'>
                        {nir.supplierSnapshot.cui}
                      </span>
                    </div>
                  </TableCell>

                  {/* Coloana 4: Recepție Link */}
                  <TableCell className='py-0 xl:py-1 text-[10px] xl:text-xs'>
                    <Button
                      variant='link'
                      size='sm'
                      className='h-auto p-0 text-muted-foreground'
                      asChild
                    >
                      <Link
                        href={`/admin/management/reception/${nir.receptionId}`}
                        className='text-[10px] xl:text-xs'
                      >
                        Recepție <ExternalLink className='ml-1 h-3 w-3' />
                      </Link>
                    </Button>
                  </TableCell>

                  {/* Coloana 5: Gestiune (Mapată) */}
                  <TableCell className='py-0 xl:py-1'>
                    {LOCATION_NAMES_MAP[
                      nir.destinationLocation as keyof typeof LOCATION_NAMES_MAP
                    ] || nir.destinationLocation}
                  </TableCell>

                  {/* Coloana 6: Total */}
                  <TableCell className='text-right font-mono text-[10px] xl:text-xs py-0 xl:py-1'>
                    {formatCurrency(nir.totals.grandTotal)}
                  </TableCell>

                  {/* Coloana 7: Status */}
                  <TableCell className='py-0 xl:py-1'>
                    <NirStatusBadge status={nir.status} />
                  </TableCell>

                  {/* Coloana 8: Acțiuni */}
                  <TableCell className='text-right py-0 xl:py-1'>
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
                              `/admin/management/reception/nir/${nir._id}`,
                            )
                          }
                        >
                          Vizualizează Detalii
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() => {
                            setPreviewNir(nir)
                            handlePrintPreview(nir._id)
                          }}
                          disabled={!!isGeneratingPdf}
                        >
                          Printează NIR
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
        <div className='flex items-center justify-center gap-2 mt-2'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Următor
          </Button>
        </div>
      )}
      {previewNir && (
        <PdfPreviewModal
          isOpen={!!previewNir}
          onClose={() => {
            setPreviewNir(null)
            setPrintData(null)
          }}
          data={printData}
          isLoading={isGeneratingPdf === previewNir._id}
        />
      )}
    </div>
  )
}
