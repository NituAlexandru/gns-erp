'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency, round2 } from '@/lib/utils'
import { InvoiceLineInput } from '@/lib/db/modules/financial/invoices/invoice.types'
import { ISeries } from '@/lib/db/modules/numbering/series.model'

interface FractionalInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (seriesName: string, chunks: InvoiceLineInput[][]) => Promise<void>
  originalItems: InvoiceLineInput[]
  grandTotal: number
  seriesList: ISeries[]
  noteSeries: string
  noteNumber: string
  clientName: string
}

export function FractionalInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  originalItems,
  grandTotal,
  seriesList,
  noteSeries,
  noteNumber,
  clientName,
}: FractionalInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<string>('')

  // Starea pentru coșuri. Inițializăm cu 2 coșuri goale.
  // Fiecare coș e un array de cantități (indexate la fel ca originalItems)
  const [chunks, setChunks] = useState<number[][]>([])

  // Resetăm starea când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      // Setăm seria default (dacă există doar una, o selectăm automat)
      if (seriesList.length === 1) {
        setSelectedSeries(seriesList[0].name)
      } else {
        setSelectedSeries('')
      }

      // Inițializăm 2 facturi (chunks), toate cantitățile la 0
      const initialChunks = [
        new Array(originalItems.length).fill(0),
        new Array(originalItems.length).fill(0),
      ]
      setChunks(initialChunks)
    }
  }, [isOpen, originalItems.length, seriesList])

  const handleAddChunk = () => {
    setChunks([...chunks, new Array(originalItems.length).fill(0)])
  }

  const handleRemoveChunk = (chunkIndex: number) => {
    const newChunks = [...chunks]
    newChunks.splice(chunkIndex, 1)
    setChunks(newChunks)
  }

  // Modificarea unei cantități într-o anumită factură
  const handleQuantityChange = (
    chunkIndex: number,
    itemIndex: number,
    value: string,
  ) => {
    const newQuantity = parseFloat(value) || 0
    const newChunks = [...chunks]
    newChunks[chunkIndex][itemIndex] = newQuantity
    setChunks(newChunks)
  }

  // --- CALCULE ÎN TIMP REAL ---

  // Calculăm restul de alocat pentru fiecare produs
  const remainingQuantities = useMemo(() => {
    return originalItems.map((item, itemIndex) => {
      const allocatedTotal = chunks.reduce(
        (sum, chunk) => sum + chunk[itemIndex],
        0,
      )
      return round2(item.quantity - allocatedTotal)
    })
  }, [originalItems, chunks])

  // Calculăm valorile totale (fără TVA, TVA, Total) ale fiecărei facturi
  const chunkTotals = useMemo(() => {
    return chunks.map((chunk) => {
      let subtotal = 0
      let vatTotal = 0
      let grandTotal = 0

      chunk.forEach((qty, itemIndex) => {
        if (qty > 0) {
          const item = originalItems[itemIndex]
          const ratio = item.quantity > 0 ? qty / item.quantity : 0

          subtotal += round2((item.lineValue || 0) * ratio)
          vatTotal += round2(
            (item.vatRateDetails?.value ?? (item as any).lineVatValue ?? 0) *
              ratio,
          )
          grandTotal += round2((item.lineTotal || 0) * ratio)
        }
      })

      return {
        subtotal: round2(subtotal),
        vatTotal: round2(vatTotal),
        grandTotal: round2(grandTotal),
      }
    })
  }, [originalItems, chunks])

  // Validări Finale
  const allItemsAllocated = remainingQuantities.every(
    (rem) => Math.abs(rem) < 0.001,
  )
  const isAnyChunkEmpty = chunkTotals.some((totals) => totals.grandTotal === 0)

  const isValid = allItemsAllocated && !isAnyChunkEmpty && selectedSeries !== ''

  // --- CONFIRMAREA ---
  const handleConfirm = async () => {
    if (!isValid) return
    setIsSubmitting(true)

    try {
      // 1. Transformăm grid-ul de cantități înapoi în obiecte InvoiceLineInput
      const finalChunksData = chunks.map((chunkQtyArray) => {
        const chunkItems: InvoiceLineInput[] = []

        chunkQtyArray.forEach((qty, itemIndex) => {
          if (qty > 0) {
            const originalItem = originalItems[itemIndex]

            // Calculăm valorile proporționale cu precizie maximă (păstrăm 6 zecimale)
            const ratio = qty / originalItem.quantity

            // Folosim direct toFixed(6) convertit înapoi în Number pentru a evita round2
            const lineValue = Number(
              (originalItem.lineValue * ratio).toFixed(6),
            )
            const vatValue = Number(
              (originalItem.vatRateDetails.value * ratio).toFixed(6),
            )
            const lineTotal = Number(
              (originalItem.lineTotal * ratio).toFixed(6),
            )

            // Clonăm linia originală și ajustăm sumele
            chunkItems.push({
              ...originalItem,
              quantity: qty,
              quantityInBaseUnit: originalItem.quantityInBaseUnit
                ? Number((originalItem.quantityInBaseUnit * ratio).toFixed(6))
                : undefined,
              lineValue: lineValue,
              vatRateDetails: {
                ...originalItem.vatRateDetails,
                value: vatValue,
              },
              lineTotal: lineTotal,
            })
          }
        })

        return chunkItems
      })

      // 2. Apelăm funcția primită ca prop (care va face call-ul spre Server Action)
      await onConfirm(selectedSeries, finalChunksData)
    } catch (error) {
      toast.error('Eroare la generarea facturilor fracționate.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isSubmitting && !open && onClose()}
    >
      <DialogContent className='max-w-[95vw] xl:max-w-[95vw] 3xl-max-w-[1600px] h-[90vh] flex flex-col p-0 gap-0'>
        <DialogHeader className='px-6 py-4 border-b bg-background shrink-0 flex flex-row items-center justify-between'>
          <div>
            <DialogTitle className='flex items-center gap-2'>
              Facturare Fracționată (CASH):
              <span className='text-primary text-sm font-normal'>
                Aviz: {noteSeries}-{noteNumber}
              </span>
            </DialogTitle>
            <DialogDescription>
              Valoarea avizului pentru{' '}
              <strong className='text-foreground'>{clientName}</strong> este de{' '}
              <strong className='text-primary'>
                {formatCurrency(grandTotal)}
              </strong>
              . Împarte cantitățile pe facturi.
            </DialogDescription>
          </div>

          <div className='w-64'>
            <Select
              value={selectedSeries}
              onValueChange={setSelectedSeries}
              disabled={isSubmitting}
            >
              <SelectTrigger
                className={!selectedSeries ? 'border-red-500' : ''}
              >
                <SelectValue placeholder='Selectează Seria...' />
              </SelectTrigger>
              <SelectContent>
                {seriesList.map((series) => (
                  <SelectItem key={String(series._id)} value={series.name}>
                    {series.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <div className='flex-1 overflow-x-auto overflow-y-auto bg-muted/10 p-4'>
          <Table className='bg-background border rounded-lg shadow-sm'>
            <TableHeader className='bg-muted/30 sticky top-0 z-10'>
              <TableRow>
                <TableHead className='min-w-[300px] xl:min-w-[400px]'>
                  Produs/Serviciu
                </TableHead>
                <TableHead className='text-center whitespace-nowrap'>
                  UM
                </TableHead>
                <TableHead className='text-right whitespace-nowrap'>
                  Preț Unitar
                </TableHead>
                <TableHead className='text-right whitespace-nowrap'>
                  Valoare (fără TVA)
                </TableHead>
                <TableHead className='text-center whitespace-nowrap'>
                  TVA %
                </TableHead>
                <TableHead className='text-right whitespace-nowrap'>
                  TVA Sumă
                </TableHead>
                <TableHead className='text-right whitespace-nowrap border-r-2'>
                  TOTAL
                </TableHead>

                <TableHead className='text-right whitespace-nowrap'>
                  Cantitate Aviz
                </TableHead>
                <TableHead className='text-right whitespace-nowrap border-r-2'>
                  Rămas de alocat
                </TableHead>

                {/* Antete Facturi */}
                {chunks.map((_, idx) => (
                  <TableHead key={idx} className='text-center min-w-[140px]'>
                    <div className='flex items-center justify-between'>
                      <span>Factura {idx + 1}</span>
                      {chunks.length > 2 && (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 text-muted-foreground hover:text-destructive'
                          onClick={() => handleRemoveChunk(idx)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}

                <TableHead className='w-[60px]'>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={handleAddChunk}
                    title='Adaugă încă o factură'
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {originalItems.map((item: any, itemIdx) => {
                const remaining = remainingQuantities[itemIdx]
                const isOverAllocated = remaining < 0

                // Mapăm corect datele care vin de pe Aviz vs Factură
                const price = item.unitPrice ?? item.priceAtTimeOfOrder ?? 0
                const vatRate = item.vatRateDetails?.rate ?? 0
                const vatSum =
                  item.vatRateDetails?.value ?? item.lineVatValue ?? 0

                return (
                  <TableRow
                    key={itemIdx}
                    className='border-b-input hover:bg-muted/5'
                  >
                    {/* INFO PRODUS EXACT CA ÎN FORMULAR */}
                    <TableCell className='py-3'>
                      <div
                        className='font-medium text-sm max-w-[400px] truncate cursor-help'
                        title={item.productName}
                      >
                        {item.productName}
                      </div>
                      <div className='text-xs text-muted-foreground mt-0.5 flex items-center gap-2'>
                        <span>Cod produs: {item.productCode}</span>
                        <span>|</span>
                        <span>
                          Cost:{' '}
                          <span className='font-medium text-red-500'>
                            {formatCurrency(item.lineCostFIFO || 0)}
                          </span>
                        </span>
                        <span>|</span>
                        <span>
                          Profit:{' '}
                          <span
                            className={`font-medium ${round2((item.lineValue || 0) - (item.lineCostFIFO || 0)) >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}
                          >
                            {formatCurrency(
                              round2(
                                (item.lineValue || 0) -
                                  (item.lineCostFIFO || 0),
                              ),
                            )}{' '}
                            (
                            {(item.lineValue || 0) > 0
                              ? round2(
                                  (round2(
                                    (item.lineValue || 0) -
                                      (item.lineCostFIFO || 0),
                                  ) /
                                    (item.lineValue || 0)) *
                                    100,
                                )
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className='text-center font-mono text-sm text-muted-foreground'>
                      {item.unitOfMeasure}
                    </TableCell>
                    <TableCell className='text-right font-mono font-medium'>
                      {formatCurrency(price)}
                    </TableCell>
                    <TableCell className='text-right font-mono font-bold'>
                      {formatCurrency(item.lineValue || 0)}
                    </TableCell>
                    <TableCell className='text-center font-mono text-muted-foreground'>
                      {vatRate}%
                    </TableCell>
                    <TableCell className='text-right font-mono text-muted-foreground'>
                      {formatCurrency(vatSum)}
                    </TableCell>
                    <TableCell className='text-right font-mono font-bold text-red-500 border-r-2'>
                      {formatCurrency(item.lineTotal || 0)}
                    </TableCell>

                    {/* ALOCARE */}
                    <TableCell className='text-right font-mono text-muted-foreground'>
                      {item.quantity}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold border-r-2 ${remaining === 0 ? 'text-green-600' : isOverAllocated ? 'text-red-500' : 'text-amber-600'}`}
                    >
                      {remaining}
                    </TableCell>

                    {/* Input-uri per factură */}
                    {chunks.map((chunk, chunkIdx) => (
                      <TableCell key={chunkIdx} className='p-2'>
                        <Input
                          type='number'
                          min='0'
                          step='any'
                          value={chunk[itemIdx] === 0 ? '' : chunk[itemIdx]}
                          onChange={(e) =>
                            handleQuantityChange(
                              chunkIdx,
                              itemIdx,
                              e.target.value,
                            )
                          }
                          className='text-center font-mono bg-background'
                          placeholder='0'
                        />
                      </TableCell>
                    ))}
                    <TableCell></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {/* BARA DE TOTALURI JOS */}
        <div className='bg-muted/20 border-t p-4 flex flex-col gap-2 shrink-0'>
          <div className='flex items-center text-sm font-semibold mb-2'>
            Totaluri Generate (Atenție la limita CASH de 5.000 lei):
          </div>
          <div className='flex gap-4 overflow-x-auto pb-2'>
            {chunkTotals.map((totals, idx) => {
              const isOverLimit = totals.grandTotal > 5000
              return (
                <div
                  key={idx}
                  className={`min-w-[220px] p-3 rounded-lg border shadow-sm bg-background flex flex-col gap-1.5 ${isOverLimit ? 'border-destructive ring-1 ring-destructive/20' : 'border-border'}`}
                >
                  <span className='text-xs font-semibold text-muted-foreground mb-1 border-b border-border/50 pb-1.5'>
                    Factura {idx + 1}
                  </span>
                  <div className='flex justify-between items-center text-[11px]'>
                    <span className='text-muted-foreground'>
                      Valoare (fără TVA):
                    </span>
                    <span className='font-mono font-medium'>
                      {formatCurrency(totals.subtotal)}
                    </span>
                  </div>
                  <div className='flex justify-between items-center text-[11px]'>
                    <span className='text-muted-foreground'>TVA:</span>
                    <span className='font-mono font-medium'>
                      {formatCurrency(totals.vatTotal)}
                    </span>
                  </div>
                  <div className='flex justify-between items-center text-sm font-bold mt-1 pt-1.5 border-t border-border/50'>
                    <span>Total:</span>
                    <span
                      className={`font-mono ${isOverLimit ? 'text-destructive' : 'text-primary'}`}
                    >
                      {formatCurrency(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter className='px-6 py-4 border-t bg-background shrink-0 flex items-center justify-between'>
          <div className='flex items-center'>
            {!allItemsAllocated && (
              <span className='flex items-center text-amber-600 text-sm font-medium'>
                <AlertCircle className='w-4 h-4 mr-2' />
                Toate cantitățile trebuie alocate (Rest = 0).
              </span>
            )}
            {isAnyChunkEmpty && allItemsAllocated && (
              <span className='flex items-center text-destructive text-sm font-medium'>
                <AlertCircle className='w-4 h-4 mr-2' />
                Aveți o factură goală. Ștergeți-o sau adăugați produse.
              </span>
            )}
          </div>

          <div className='flex gap-3'>
            <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
              Anulează
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid || isSubmitting}
              className='bg-primary hover:bg-primary/90 text-white min-w-[140px]'
            >
              {isSubmitting ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Check className='mr-2 h-4 w-4' />
              )}
              Emite Facturile
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
