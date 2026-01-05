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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  Calculator,
  ArrowLeft,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { formatCurrency, round2 } from '@/lib/utils'
import { ClientWithSummary } from '@/lib/db/modules/client/summary/client-summary.model'
import { InvoiceLineInput } from '@/lib/db/modules/financial/invoices/invoice.types'
import { InlineClientSelector } from './InlineClientSelector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SplitInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (
    configs: { clientId: string; percentage: number }[]
  ) => Promise<void>
  originalClient: IClientDoc | null
  grandTotal: number
  currency: string
  originalItems: InvoiceLineInput[]
}

interface SplitRow {
  clientId: string
  clientName: string
  clientData: ClientWithSummary | null
  percentage: number
  isOriginal: boolean
}

export function SplitInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  originalClient,
  grandTotal,
  currency,
  originalItems,
}: SplitInvoiceModalProps) {
  const [rows, setRows] = useState<SplitRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'config' | 'preview'>('config')
  const [activePreviewTab, setActivePreviewTab] = useState<string>('')

  // Inițializare
  useEffect(() => {
    if (isOpen && originalClient) {
      // Întotdeauna pornim de la zero (Reset)
      setRows([
        {
          clientId: originalClient._id.toString(),
          clientName: originalClient.name,
          clientData: originalClient as ClientWithSummary,
          percentage: 100,
          isOriginal: true,
        },
      ])
      setViewMode('config')
    }
  }, [isOpen, originalClient])

  const totalPercentage = rows.reduce((sum, r) => sum + (r.percentage || 0), 0)
  const isValid = Math.abs(totalPercentage - 100) < 0.01

  // --- LOGICA DE CALCUL DISTRIBUȚIE ---
  const previewData = useMemo(() => {
    if (viewMode !== 'preview' || !isValid) return null

    try {
      // 1. Calculăm distribuția per articol
      const itemDistributions = originalItems.map((item) => {
        // --- IDENTIFICARE TIP ARTICOL ---
        // Stocabil = Produs sau Ambalaj, DAR NU Manual
        const isStockable =
          !item.isManualEntry &&
          !item.serviceId &&
          (item.stockableItemType === 'ERPProduct' ||
            item.stockableItemType === 'Packaging')

        // --- PREGĂTIRE DATE (CONVERSIE UM) ---
        // Conversia se aplică doar la stocabile
        const shouldConvertToBase =
          isStockable &&
          item.conversionFactor &&
          item.conversionFactor > 1 &&
          item.baseUnit

        // Cantitatea Totală (Bază sau Originală)
        const totalQty = shouldConvertToBase
          ? item.quantity * (item.conversionFactor || 1)
          : item.quantity

        // Prețul Unitar de Referință (Bază sau Original)
        const refUnitPrice = shouldConvertToBase
          ? item.priceInBaseUnit ||
            item.unitPrice / (item.conversionFactor || 1)
          : item.unitPrice

        const refUM = shouldConvertToBase
          ? item.baseUnit || item.unitOfMeasure
          : item.unitOfMeasure

        // ============================================================
        // CAZ 1: PRODUSE & AMBALAJE (Împărțim CANTITATEA, Preț Fix)
        // ============================================================
        if (isStockable) {
          let allocatedQty = 0

          const distribution = rows.map((row, idx) => {
            // Calculăm cantitatea întreagă (fără zecimale)
            const qty = Math.floor(totalQty * (row.percentage / 100))
            allocatedQty += qty
            return {
              rowIndex: idx,
              qty: qty,
              percentage: row.percentage,
            }
          })

          // Gestionăm restul (bucățile rămase din rotunjire)
          let remainder = Math.round(totalQty - allocatedQty)

          // Distribuim restul la clienții cu cota cea mai mare
          const sortedIndices = distribution
            .map((d, i) => ({ ...d, originalIndex: i }))
            .sort((a, b) => b.percentage - a.percentage)

          let i = 0
          while (remainder > 0) {
            const targetIndex =
              sortedIndices[i % sortedIndices.length].originalIndex
            distribution[targetIndex].qty += 1
            remainder -= 1
            i++
          }

          return {
            type: 'STOCKABLE',
            baseDetails: {
              um: refUM,
              unitPrice: refUnitPrice,
              conversionFactor: shouldConvertToBase ? 1 : item.conversionFactor,
            },
            splits: distribution,
          }
        }

        // ============================================================
        // CAZ 2: SERVICII, AUTORIZAȚII, MANUALE (Duplicăm CANTITATEA, Împărțim PREȚUL)
        // ============================================================
        else {
          const distribution = rows.map((row, idx) => {
            const splitNetValue = (item.lineValue * row.percentage) / 100
            const newNetUnitPrice = splitNetValue / totalQty

            return {
              rowIndex: idx,
              qty: totalQty,
              unitPrice: newNetUnitPrice,
            }
          })

          return {
            type: 'SERVICE',
            baseDetails: {
              um: item.unitOfMeasure,
              conversionFactor: item.conversionFactor,
            },
            splits: distribution,
          }
        }
      })

      // 2. Reconstruim structura pe Clienți (salvăm în variabilă, nu returnăm direct)
      const initialInvoices = rows.map((row, rowIndex) => {
        const clientItems = originalItems.map((originalItem, itemIndex) => {
          const distData = itemDistributions[itemIndex]

          // Luăm datele specifice acestui client
          const mySplit =
            distData.type === 'STOCKABLE'
              ? distData.splits[rowIndex]
              : (distData.splits as any)[rowIndex]

          const finalQty = mySplit.qty

          // Determinăm prețul unitar final
          const finalUnitPrice =
            distData.type === 'STOCKABLE'
              ? distData.baseDetails.unitPrice
              : mySplit.unitPrice

          // --- RECALCULARE FINALĂ ---
          const finalValue = round2(finalQty * finalUnitPrice)
          const vatRate = originalItem.vatRateDetails?.rate || 0
          const finalVat = round2((finalValue * vatRate) / 100)
          const finalTotal = round2(finalValue + finalVat)

          return {
            ...originalItem,
            quantity: finalQty,
            unitOfMeasure: distData.baseDetails.um,
            unitPrice: finalUnitPrice,
            conversionFactor: distData.baseDetails.conversionFactor,
            lineValue: finalValue,
            lineTotal: finalTotal,
            vatRateDetails: {
              ...originalItem.vatRateDetails,
              value: finalVat,
            },
          }
        })

        // Calculăm totalul per factură
        const newGrandTotal = clientItems.reduce(
          (acc, item) => acc + item.lineTotal,
          0
        )

        return {
          clientId: row.clientId,
          clientName: row.clientName || 'Client Necunoscut',
          items: clientItems,
          totals: { grandTotal: newGrandTotal },
        }
      })

      // --- 3. GLOBAL FAIL-SAFE (Corecție Total General) ---
      // Aici rezolvăm problema cu banul în plus/minus

      const calculatedGrandTotal = initialInvoices.reduce(
        (sum, inv) => sum + inv.totals.grandTotal,
        0
      )

      // Diferența (ex: +0.01 sau -0.01)
      const globalDiff = round2(calculatedGrandTotal - grandTotal)

      if (globalDiff !== 0) {
        // Găsim factura clientului principal (cel cu cota cea mai mare)
        const sortedIndices = rows
          .map((r, i) => ({ idx: i, pct: r.percentage }))
          .sort((a, b) => b.pct - a.pct)

        const targetIdx = sortedIndices[0].idx
        const targetInvoice = initialInvoices[targetIdx]

        // Căutăm o linie potrivită pentru ajustare (Serviciu sau Manual e ideal)
        // Dacă nu, luăm linia cu valoarea cea mai mare
        let lineIdx = targetInvoice.items.findIndex(
          (i) => !i.stockableItemType || i.isManualEntry || i.serviceId
        )

        if (lineIdx === -1) {
          lineIdx = targetInvoice.items.reduce(
            (maxI, item, i, arr) =>
              item.lineTotal > arr[maxI].lineTotal ? i : maxI,
            0
          )
        }

        if (lineIdx !== -1) {
          const line = targetInvoice.items[lineIdx]

          // Corectăm Totalul și TVA-ul
          const newLineTotal = round2(line.lineTotal - globalDiff)
          const newVat = round2(line.vatRateDetails.value - globalDiff)

          // Aplicăm corecția pe linie
          targetInvoice.items[lineIdx] = {
            ...line,
            lineTotal: newLineTotal,
            vatRateDetails: {
              ...line.vatRateDetails,
              value: newVat,
            },
          }

          // Aplicăm corecția pe totalul facturii
          targetInvoice.totals.grandTotal = round2(
            targetInvoice.totals.grandTotal - globalDiff
          )
        }
      }

      return initialInvoices
    } catch (error) {
      console.error('Eroare la calcul preview:', error)
      return null
    }
  }, [viewMode, isValid, rows, originalItems, grandTotal])

  // Restul componentei (Handlers, Render) rămâne neschimbat
  useEffect(() => {
    if (viewMode === 'preview' && previewData && previewData.length > 0) {
      const activeExists = previewData.some(
        (p) => p.clientId === activePreviewTab
      )
      if (!activePreviewTab || !activeExists) {
        setActivePreviewTab(previewData[0].clientId)
      }
    }
  }, [viewMode, previewData, activePreviewTab])

  const handleAddClient = () => {
    setRows([
      ...rows,
      {
        clientId: '',
        clientName: '',
        clientData: null,
        percentage: 0,
        isOriginal: false,
      },
    ])
  }

  const handleRemoveRow = (index: number) => {
    const newRows = [...rows]
    newRows.splice(index, 1)
    setRows(newRows)
  }

  const handlePercentageChange = (index: number, value: string) => {
    const numVal = parseFloat(value)
    const newRows = [...rows]
    newRows[index].percentage = isNaN(numVal) ? 0 : numVal
    setRows(newRows)
  }

  const handleClientSelect = (index: number, client: IClientDoc | null) => {
    const newRows = [...rows]
    if (client) {
      newRows[index].clientId = client._id.toString()
      newRows[index].clientName = client.name
      newRows[index].clientData = client as ClientWithSummary
    } else {
      newRows[index].clientId = ''
      newRows[index].clientName = ''
      newRows[index].clientData = null
    }
    setRows(newRows)
  }

  const handleConfirm = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    try {
      const configs = rows.map((r) => ({
        clientId: r.clientId,
        percentage: r.percentage,
      }))
      await onConfirm(configs)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEstimatedValue = (pct: number) => (grandTotal * pct) / 100

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isSubmitting && !open && onClose()}
    >
      <DialogContent className='max-w-[95vw] md:max-w-[85vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 gap-0'>
        <DialogHeader className='px-6 py-4 border-b shrink-0 bg-background z-10 rounded-t-lg flex flex-row items-center justify-between'>
          <div>
            <DialogTitle>Facturare Multiplă (Split)</DialogTitle>
            <DialogDescription>
              {viewMode === 'config'
                ? `Configurați cotele pentru suma totală de ${formatCurrency(
                    grandTotal
                  )} ${currency}.`
                : 'Verificați distribuția produselor înainte de generare.'}
            </DialogDescription>
          </div>

          <div className='flex items-center gap-2 mr-8'>
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                viewMode === 'config' ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                viewMode === 'preview' ? 'bg-primary' : 'bg-muted'
              }`}
            />
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto bg-muted/10'>
          {viewMode === 'config' && (
            <div className='p-6 space-y-6'>
              <div className='grid grid-cols-12 gap-6 text-sm font-medium text-muted-foreground px-4'>
                <div className='col-span-7 lg:col-span-6'>Partener</div>
                <div className='col-span-2 text-right'>Cota (%)</div>
                <div className='col-span-2 lg:col-span-3 text-right'>
                  Valoare Est.
                </div>
                <div className='col-span-1'></div>
              </div>

              <div className='space-y-4'>
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-12 gap-6 items-start p-4 rounded-lg border shadow-sm bg-card transition-colors ${
                      !row.clientId ? 'border-dashed border-yellow-400' : ''
                    }`}
                  >
                    <div className='col-span-7 lg:col-span-6'>
                      {row.isOriginal ? (
                        <div className='p-3 border rounded bg-muted/20'>
                          <div
                            className='font-semibold text-base truncate'
                            title={row.clientName}
                          >
                            {row.clientName}
                            <span className='ml-2 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold'>
                              TITULAR
                            </span>
                          </div>
                          <div className='text-xs text-muted-foreground mt-1'>
                            CUI: {row.clientData?.vatId || row.clientData?.cnp}
                          </div>
                        </div>
                      ) : (
                        <InlineClientSelector
                          onClientSelect={(c) => handleClientSelect(index, c)}
                          selectedClient={row.clientData}
                        />
                      )}
                    </div>
                    <div className='col-span-2 pt-1'>
                      <div className='relative'>
                        <Input
                          type='number'
                          min='0'
                          max='100'
                          step='0.01'
                          className={`text-right pr-7 h-10 font-mono text-lg ${
                            row.percentage === 0
                              ? 'border-red-500 ring-red-200'
                              : ''
                          }`}
                          value={row.percentage || ''}
                          onChange={(e) =>
                            handlePercentageChange(index, e.target.value)
                          }
                        />
                        <span className='absolute right-3 top-2.5 text-sm text-muted-foreground font-bold'>
                          %
                        </span>
                      </div>
                    </div>
                    <div className='col-span-2 lg:col-span-3 text-right pt-2.5 font-mono text-lg font-medium '>
                      {formatCurrency(getEstimatedValue(row.percentage))}
                    </div>
                    <div className='col-span-1 flex justify-end pt-1'>
                      {!row.isOriginal && (
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleRemoveRow(index)}
                        >
                          <Trash2 className='h-5 w-5 text-muted-foreground hover:text-destructive' />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type='button'
                variant='outline'
                size='lg'
                className='w-full border-dashed border-2 py-6'
                onClick={handleAddClient}
              >
                <Plus className='mr-2 h-5 w-5' /> Adaugă încă un Partener
              </Button>
            </div>
          )}

          {viewMode === 'preview' && previewData && (
            <div className='p-6 h-full flex flex-col'>
              <Tabs
                value={activePreviewTab}
                onValueChange={setActivePreviewTab}
                className='w-full h-full flex flex-col'
              >
                <TabsList className='w-full justify-start overflow-x-auto h-auto p-2 bg-muted/50 mb-4 shrink-0'>
                  {previewData.map((inv) => (
                    <TabsTrigger
                      key={inv.clientId}
                      value={inv.clientId}
                      className='px-4 py-2 h-auto flex flex-col items-start gap-1 cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm'
                    >
                      <div className='font-semibold text-sm truncate max-w-[250px] '>
                        {inv.clientName}
                      </div>
                      <div className='text-xs text-muted-foreground font-mono'>
                        {formatCurrency(inv.totals.grandTotal)}
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {previewData.map((inv) => (
                  <TabsContent
                    key={inv.clientId}
                    value={inv.clientId}
                    className='flex-1 overflow-hidden flex flex-col border rounded-md bg-card shadow-sm mt-0'
                  >
                    <div className='p-4 border-b bg-muted/20 flex justify-between items-center'>
                      <div className='font-medium text-sm'>
                        Linii Factură ({inv.items.length})
                      </div>
                      <div className='font-mono font-bold'>
                        {formatCurrency(inv.totals.grandTotal)}
                      </div>
                    </div>

                    <div className='flex-1 overflow-y-auto p-0'>
                      <Table>
                        <TableHeader className='bg-muted/10 sticky top-0 z-10 text-xs uppercase text-muted-foreground'>
                          <TableRow className='hover:bg-transparent border-b-input'>
                            <TableHead className='px-4 py-3 text-left font-medium h-auto text-muted-foreground'>
                              Produs
                            </TableHead>
                            <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                              Cotă Reală
                            </TableHead>
                            <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                              Cantitate
                            </TableHead>
                            <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                              Preț Unit.
                            </TableHead>
                            <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                              Valoare
                            </TableHead>
                            <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                              TVA
                            </TableHead>
                            <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                              Total
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inv.items.map((item, idx) => {
                            // 1. Calculăm procentul REAL
                            const originalTotal =
                              originalItems[idx]?.lineTotal || 0
                            const realPercentage =
                              originalTotal !== 0
                                ? (item.lineTotal / originalTotal) * 100
                                : 0

                            // 2. Găsim procentul ȚINTĂ
                            const targetRow = rows.find(
                              (r) => r.clientId === inv.clientId
                            )
                            const targetPercentage = targetRow?.percentage || 0

                            // 3. Verificăm potrivirea
                            const isMatch =
                              Math.abs(realPercentage - targetPercentage) < 0.01

                            const colorClass = isMatch
                              ? 'text-green-600'
                              : 'text-red-600'

                            return (
                              <TableRow
                                key={idx}
                                className={`hover:bg-muted/5 border-b-input ${
                                  item.quantity === 0 ? 'opacity-40' : ''
                                }`}
                              >
                                <TableCell className='px-4 py-3 font-medium'>
                                  {item.productName}
                                </TableCell>

                                {/* Cotă Reală */}
                                <TableCell
                                  className={`px-4 py-3 text-right font-mono font-bold ${colorClass}`}
                                >
                                  {realPercentage.toFixed(2)}%
                                </TableCell>

                                <TableCell className='px-4 py-3 text-right font-mono'>
                                  {item.quantity}{' '}
                                  <span className='text-xs text-muted-foreground ml-1'>
                                    {item.unitOfMeasure}
                                  </span>
                                </TableCell>
                                <TableCell className='px-4 py-3 text-right font-mono text-muted-foreground'>
                                  {formatCurrency(item.unitPrice)}
                                </TableCell>
                                <TableCell className='px-4 py-3 text-right font-mono'>
                                  {formatCurrency(item.lineValue)}
                                </TableCell>
                                <TableCell className='px-4 py-3 text-right font-mono text-muted-foreground'>
                                  {formatCurrency(item.vatRateDetails.value)}
                                </TableCell>
                                <TableCell className='px-4 py-3 text-right font-mono font-semibold'>
                                  {formatCurrency(item.lineTotal)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter className='px-6 py-4 border-t shrink-0 bg-muted/20 gap-4 sm:justify-between items-center'>
          {viewMode === 'config' && (
            <div className='flex flex-col sm:flex-row gap-4 items-center'>
              <div className='flex items-center gap-2 bg-background px-4 py-2 rounded-md border shadow-sm'>
                <span className='text-sm font-medium text-muted-foreground'>
                  Total:
                </span>
                <span
                  className={`text-xl font-bold ${
                    isValid ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {totalPercentage.toFixed(2)}%
                </span>
              </div>
              {!isValid && (
                <div className='flex items-center text-red-600 text-sm font-medium animate-pulse'>
                  <AlertCircle className='h-5 w-5 mr-2' /> 100% necesar
                </div>
              )}
            </div>
          )}

          <div className='flex gap-2 w-full sm:w-auto justify-end ml-auto'>
            {viewMode === 'config' ? (
              <>
                <Button
                  variant='outline'
                  onClick={onClose}
                  disabled={isSubmitting}
                  className='h-11 px-6'
                >
                  Anulează
                </Button>
                <Button
                  onClick={() => {
                    if (rows.some((r) => !r.clientId)) {
                      toast.error('Selectați toți partenerii.')
                      return
                    }
                    setViewMode('preview')
                  }}
                  disabled={!isValid}
                  className='bg-primary hover:bg-primary/90 text-white h-11 px-8 text-base shadow-md'
                >
                  <Calculator className='mr-2 h-5 w-5' /> Previzualizare
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant='outline'
                  onClick={() => setViewMode('config')}
                  disabled={isSubmitting}
                  className='h-11 px-6'
                >
                  <ArrowLeft className='mr-2 h-4 w-4' /> Înapoi la Configurare
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className='bg-green-600 hover:bg-green-700 text-white h-11 px-8 text-base shadow-md'
                >
                  {isSubmitting ? (
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                  ) : (
                    <Check className='mr-2 h-5 w-5' />
                  )}
                  Confirmă și Generează
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
