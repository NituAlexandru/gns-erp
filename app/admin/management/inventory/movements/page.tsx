'use client'

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { getStockMovements } from '@/lib/db/modules/inventory/inventory.actions.read'
import { format, subDays, parseISO } from 'date-fns'
import { ro } from 'date-fns/locale'
import { PopulatedStockMovement } from '@/lib/db/modules/inventory/types'
import {
  LOCATION_NAMES_MAP,
  MOVEMENT_TYPE_DETAILS_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import { cn, formatCurrency, formatId } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { MovementsFilters, MovementsFiltersState } from './movements-filters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Tip pentru UI
type ExtendedStockMovement = PopulatedStockMovement & {
  supplier?: { _id: string; name: string } | null
  client?: { _id: string; name: string } | null
  documentNumber?: string
  stockableItem?: {
    _id: string
    name: string
    code?: string
  }
  lineCost?: number
  unitCost?: number
  salePrice?: number
  packagingOptions?: {
    unitName: string
    baseUnitEquivalent: number
  }[]
}
// Tip pentru Totaluri
type MovementsTotals = {
  totalValueIn: number
  totalValueOut: number
  totalSalesOut: number
  totalQtyIn: number | null
  totalQtyOut: number | null
  commonUnit: string
}

export default function StockMovementsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [movements, setMovements] = useState<ExtendedStockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const currentPage = Number(searchParams.get('page')) || 1
  const [totals, setTotals] = useState<MovementsTotals | null>(null)
  const [headerUnit, setHeaderUnit] = useState<string>('DEFAULT')

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    replace(`${pathname}?${params.toString()}`)
  }

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Construim obiectul de filtre DIN URL Params
      const filtersFromUrl: MovementsFiltersState = {
        q: searchParams.get('q') || '',
        location: searchParams.get('location') || 'ALL',
        type: searchParams.get('type') || 'ALL',
        dateRange: {
          from: searchParams.get('from')
            ? parseISO(searchParams.get('from')!)
            : subDays(new Date(), 30),
          to: searchParams.get('to')
            ? parseISO(searchParams.get('to')!)
            : new Date(),
        },
      }

      const res: any = await getStockMovements(filtersFromUrl, currentPage)

      setMovements(res.data as ExtendedStockMovement[])
      setTotalPages(res.totalPages || 1)
      setTotalDocs(res.totalDocs || 0)
      setTotals(res.totals || null)
    } catch (error) {
      console.error('Failed to fetch stock movements:', error)
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [searchParams, currentPage])

  // Trigger fetch când se schimbă URL-ul (filtre sau pagină)
  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const headerPackagingOptions = movements.find(
    (m) => m.packagingOptions && m.packagingOptions.length > 0,
  )?.packagingOptions
  const activeHeaderUnit =
    headerUnit === 'DEFAULT' || !totals ? totals?.commonUnit : headerUnit

  const activeHeaderOption = headerPackagingOptions?.find(
    (opt) => opt.unitName === activeHeaderUnit,
  )

  // Dacă avem o opțiune selectată, folosim factorul ei. Altfel factorul este 1 (bază).
  const headerFactor = activeHeaderOption
    ? activeHeaderOption.baseUnitEquivalent
    : 1

  return (
    <div className='h-[calc(100vh-6rem)] flex flex-col border-1 p-4 rounded-2xl'>
      <div className='flex flex-col justify-between items-start mb-1'>
        <div className='flex'>
          <div>
            <h3 className='font-bold pt-1 text-sm lg:text-xs 2xl:text-base'>
              Mișcări Stoc (Jurnal)
            </h3>
            {totalDocs > 0 && (
              <span className='text-[10px] md:text-sm lg:text-xs text-muted-foreground '>
                ({totalDocs} înregistrări)
              </span>
            )}
          </div>
          {totals && (
            <div className='lg:flex items-center gap-2 px-2 border-l border-border 2xl:gap-4 2xl:px-4'>
              {/* --- TOTAL INTRĂRI --- */}
              <div className='flex flex-col items-center gap-0 text-green-600'>
                <span className='text-xs font-semibold uppercase'>
                  Total Intrări:
                </span>
                <span className='font-bold'>
                  {formatCurrency(totals.totalValueIn)}
                </span>

                {totals.totalQtyIn !== null && (
                  <div className='flex items-center gap-1 font-bold'>
                    <span>
                      ({(totals.totalQtyIn / headerFactor).toFixed(2)}
                    </span>

                    {/* DROPDOWN SELECT UM */}
                    <Select value={headerUnit} onValueChange={setHeaderUnit}>
                      <SelectTrigger className='cursor-pointer !h-6 min-h-0 py-0 min-w-[65px] px-2 text-xs border border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400 font-bold rounded-md mx-1'>
                        <SelectValue placeholder={totals.commonUnit}>
                          {activeHeaderUnit}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {/* Unitatea de Bază */}
                        <SelectItem
                          value='DEFAULT'
                          className='text-xs cursor-pointer'
                        >
                          {totals.commonUnit}
                        </SelectItem>
                        {/* Opțiunile de Conversie */}
                        {headerPackagingOptions?.map((opt, idx) => (
                          <SelectItem
                            key={idx}
                            value={opt.unitName}
                            className='text-xs cursor-pointer'
                          >
                            {opt.unitName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>)</span>
                  </div>
                )}
              </div>
              <div className='w-px h-4 bg-border mx-1'></div>
              {/* --- TOTAL IEȘIRI --- */}
              <div className='flex flex-col items-center gap-0 text-red-600'>
                <span className='text-xs font-semibold uppercase'>
                  Cost Ieșiri (Gestiune)
                </span>
                <span className='font-bold'>
                  {formatCurrency(totals.totalValueOut)}
                </span>

                {totals.totalQtyOut !== null && (
                  <div className='flex items-center gap-1 font-bold'>
                    <span>
                      ({(totals.totalQtyOut / headerFactor).toFixed(2)}
                    </span>

                    {/* DROPDOWN SELECT UM (Sincronizat) */}
                    <Select value={headerUnit} onValueChange={setHeaderUnit}>
                      <SelectTrigger className='cursor-pointer !h-6 min-h-0 py-0 min-w-[65px] px-2 text-xs border border-red-200 bg-red-50/50 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-400 font-bold rounded-md mx-1'>
                        <SelectValue placeholder={totals.commonUnit}>
                          {activeHeaderUnit}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value='DEFAULT'
                          className='text-xs cursor-pointer'
                        >
                          {totals.commonUnit}
                        </SelectItem>
                        {headerPackagingOptions?.map((opt, idx) => (
                          <SelectItem
                            key={idx}
                            value={opt.unitName}
                            className='text-xs cursor-pointer'
                          >
                            {opt.unitName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>)</span>
                  </div>
                )}
              </div>
              <div className='flex flex-col items-center ml-4 gap-0 text-red-600'>
                <span className='text-xs font-semibold uppercase'>
                  Total Vânzări (Est.)
                </span>
                <span className='font-bold'>
                  {formatCurrency(totals.totalSalesOut)}
                </span>
                {/* Nu afișăm cantitate aici, e redundantă (e aceeași ca la Ieșiri) */}
              </div>
            </div>
          )}
        </div>
        {/* Componenta Filtre nu mai are nevoie de props, își ia starea din URL */}
        <MovementsFilters />
      </div>

      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <p>Se încarcă mișcările de stoc...</p>
        </div>
      ) : (
        <>
          <div className='overflow-auto flex-1 border rounded-md relative'>
            <Table>
              <TableHeader className='sticky top-0 bg-background z-20 shadow-sm'>
                <TableRow>
                  <TableHead className='w-[50px] xl:w-[75px] text-[10px] lg:text-xs 2xl:text-base'>
                    Cod
                  </TableHead>
                  <TableHead className='w-[140px] text-[10px] lg:text-xs 2xl:text-base'>
                    Dată
                  </TableHead>
                  <TableHead className='w-[100px] text-[10px] lg:text-xs 2xl:text-base'>
                    Tip
                  </TableHead>
                  <TableHead className='w-[150px] text-[10px] lg:text-xs 2xl:text-base'>
                    Detalii
                  </TableHead>
                  <TableHead className='max-w-[250px] text-[10px] lg:text-xs 2xl:text-base'>
                    Produs
                  </TableHead>
                  <TableHead>Partener</TableHead>
                  <TableHead className='text-right text-[10px] lg:text-xs 2xl:text-base'>
                    Cantitate
                  </TableHead>
                  <TableHead>UM</TableHead>
                  <TableHead className='text-right text-[10px] lg:text-xs 2xl:text-base'>
                    Preț Unitar
                  </TableHead>
                  <TableHead className='text-right text-[10px] lg:text-xs 2xl:text-base'>
                    Valoare
                  </TableHead>
                  <TableHead className='text-[10px] lg:text-xs 2xl:text-base'>
                    Locație
                  </TableHead>
                  <TableHead className='text-[10px] lg:text-xs 2xl:text-base'>
                    Operator
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='h-24 text-center'>
                      Nu există date.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => {
                    const locationId =
                      movement.locationFrom || movement.locationTo
                    const locationName = locationId
                      ? LOCATION_NAMES_MAP[locationId]
                      : '-'
                    const isMovementIn = IN_TYPES.has(movement.movementType)

                    const movementTypeName =
                      MOVEMENT_TYPE_DETAILS_MAP[movement.movementType]?.name ||
                      movement.movementType

                    let partnerName = '-'
                    if (movement.supplier?.name) {
                      partnerName = movement.supplier.name
                    } else if (movement.client?.name) {
                      partnerName = movement.client.name
                    } else if (movement.note?.includes('de la furnizor')) {
                      partnerName =
                        movement.note.split('de la furnizor')[1]?.trim() || '-'
                    }

                    return (
                      <TableRow key={movement._id}>
                        <TableCell className='font-mono text-xs text-muted-foreground w-[75px]'>
                          <Link
                            href={`/admin/management/inventory/movements/${movement._id}`}
                            className='underline hover:text-primary'
                            title={`Vezi detalii mișcare ${formatId(movement._id)}`}
                          >
                            {movement.stockableItem?.code || '-'}
                          </Link>
                        </TableCell>

                        <TableCell className='text-[10px] lg:text-[12px] 2xl:text-xs'>
                          {movement.timestamp
                            ? format(
                                new Date(movement.timestamp),
                                'dd/MM/yy HH:mm',
                                { locale: ro },
                              )
                            : '-'}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={isMovementIn ? 'outline' : 'default'}
                            className={cn(
                              'font-bold text-[10px] max-w-[50px]',
                              isMovementIn
                                ? ' border-green-200 bg-green-600'
                                : '',
                            )}
                          >
                            {isMovementIn ? 'INTRARE' : 'IEȘIRE'}
                          </Badge>
                        </TableCell>

                        <TableCell className='text-xs text-muted-foreground '>
                          {movementTypeName}
                        </TableCell>

                        <TableCell className='max-w-[150px] xl:max-w-[180px] 3xl:max-w-[220px] text-xs'>
                          <div className='flex items-center gap-1 group relative'>
                            <span
                              className='truncate font-medium block'
                              title={movement.stockableItem?.name}
                            >
                              {movement.stockableItem?.name || 'N/A'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className='text-xs 3xl:text-sm max-w-[130px] 2xl:max-w-[180px] truncate'>
                          {partnerName}
                        </TableCell>

                        {/* 1. CELULA CANTITATE */}
                        <TableCell className='text-right align-center py-1 lg:py-0 xl:py-0.5'>
                          <div className='flex flex-col gap-0'>
                            {/* Cantitate Principală */}
                            <span className='font-bold text-xs xl:text-sm leading-none'>
                              {movement.quantity.toFixed(2)}
                            </span>
                            {/* Cantități Convertite */}
                            {movement.packagingOptions?.map((opt, idx) => (
                              <span
                                key={idx}
                                className='font-bold text-xs xl:text-sm leading-none'
                              >
                                {(
                                  movement.quantity / opt.baseUnitEquivalent
                                ).toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </TableCell>

                        {/* 2. CELULA UM */}
                        <TableCell className='align-center py-1 lg:py-0'>
                          <div className='flex flex-col gap-0'>
                            {/* UM Principală */}
                            <span className='text-xs xl:text-sm leading-none'>
                              {movement.unitMeasure || '-'}
                            </span>
                            {/* UM Convertite */}
                            {movement.packagingOptions?.map((opt, idx) => (
                              <span
                                key={idx}
                                className='text-xs xl:text-sm leading-none'
                              >
                                {opt.unitName}
                              </span>
                            ))}
                          </div>
                        </TableCell>

                        {/* 3. CELULA PREȚ UNITAR (Aici facem conversia prin ÎNMULȚIRE) */}
                        <TableCell className='text-right align-center py-1 lg:py-0 xl:py-0.5'>
                          <div className='flex flex-col gap-0'>
                            {(() => {
                              let displayBasePrice = 0
                              let showPrice = false

                              if (isMovementIn) {
                                // INTRARE: Arătăm Costul
                                displayBasePrice = movement.unitCost || 0
                                showPrice = true
                              } else {
                                // IEȘIRE: Arătăm DOAR dacă avem Sale Price. Fără fallback.
                                if (movement.salePrice) {
                                  displayBasePrice = movement.salePrice
                                  showPrice = true
                                } else {
                                  showPrice = false
                                }
                              }

                              const colorClass = isMovementIn
                                ? 'text-green-600'
                                : 'text-red-600'

                              return (
                                <>
                                  <span
                                    className={cn(
                                      'font-mono text-xs xl:text-sm leading-none',
                                      showPrice ? colorClass : '',
                                    )}
                                  >
                                    {showPrice
                                      ? formatCurrency(displayBasePrice)
                                      : '-'}
                                  </span>

                                  {/* Conversii - apar doar dacă avem un preț valid de afișat */}
                                  {showPrice &&
                                    movement.packagingOptions?.map(
                                      (opt, idx) => {
                                        const convertedPrice =
                                          displayBasePrice *
                                          opt.baseUnitEquivalent
                                        return (
                                          <span
                                            key={idx}
                                            className={cn(
                                              'font-mono text-xs xl:text-sm leading-none',
                                              colorClass,
                                            )}
                                          >
                                            {formatCurrency(convertedPrice)}
                                          </span>
                                        )
                                      },
                                    )}
                                </>
                              )
                            })()}
                          </div>
                        </TableCell>

                        {/* Coloana Valoare Totală */}
                        <TableCell className='text-right font-bold text-xs xl:text-sm 2xl:text-xs font-mono lg:py-0'>
                          {(() => {
                            let totalValue = 0
                            let showValue = false

                            if (isMovementIn) {
                              // INTRARE: Afișăm Valoarea de Intrare (Costul)
                              // De obicei lineCost vine din backend, dar ca fallback calculăm qty * unitCost
                              totalValue =
                                movement.lineCost ||
                                movement.quantity * (movement.unitCost || 0)
                              showValue = true
                            } else {
                              // IEȘIRE: Afișăm Valoarea de Vânzare (Qty * SalePrice)
                              if (movement.salePrice) {
                                totalValue =
                                  movement.quantity * movement.salePrice
                                showValue = true
                              } else {
                                showValue = false
                              }
                            }

                            // Aceeași logică de culori ca la Preț Unitar
                            const colorClass = isMovementIn
                              ? 'text-green-600'
                              : 'text-red-600'

                            return (
                              <span className={showValue ? colorClass : ''}>
                                {showValue ? formatCurrency(totalValue) : '-'}
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className='text-xs'>
                          {locationName}
                        </TableCell>
                        <TableCell className='text-xs'>
                          {movement.responsibleUser?.name || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer cu Paginare legată de URL */}
          <div className='flex justify-between items-center pt-2 mt-2 border-t'>
            <div className='text-sm text-muted-foreground'>
              Pagina {currentPage} din {totalPages}
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className='h-4 w-4 mr-1' />
                Anterior
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  handlePageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Următor
                <ChevronRight className='h-4 w-4 ml-1' />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
