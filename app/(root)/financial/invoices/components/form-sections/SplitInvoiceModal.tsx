'use client'

import { useState, useEffect } from 'react'
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
import {
  InvoiceLineInput,
  InvoiceInput,
} from '@/lib/db/modules/financial/invoices/invoice.types'
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
    configs: { clientId: string; percentage: number }[],
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
  // Stare pentru Preview
  const [viewMode, setViewMode] = useState<'config' | 'preview'>('config')
  const [previewData, setPreviewData] = useState<InvoiceInput[] | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
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
      setPreviewData(null)
    }
  }, [isOpen, originalClient])

  const totalPercentage = rows.reduce((sum, r) => sum + (r.percentage || 0), 0)
  const isValid = Math.abs(totalPercentage - 100) < 0.01

  // --- LOGICA DE CALCUL: SERVER-SIDE ---
  // Când trecem pe modul 'preview', cerem backend-ului să calculeze
  useEffect(() => {
    if (viewMode === 'preview' && isValid) {
      const fetchPreview = async () => {
        setIsLoadingPreview(true)
        try {
          // Pregătim config-ul pentru backend
          const splitConfigs = rows.map((r) => ({
            clientId: r.clientId, // ID-ul real sau gol
            clientSnapshot: r.clientData || {}, // Mock snapshot
            percentage: r.percentage,
          }))

          // Date comune dummy
          const commonData = {
            currency: currency,
            status: 'Draft',
          }

          const response = await fetch(
            '/api/financial/invoices/split-preview',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                originalItems,
                splitConfigs,
                commonData,
              }),
            },
          )

          if (!response.ok) throw new Error('Eroare la calcul')

          const data: InvoiceInput[] = await response.json()
          setPreviewData(data)

          // Setăm primul tab activ dacă există date și client valid
          if (data.length > 0 && data[0].clientId) {
            setActivePreviewTab(data[0].clientId)
          }
        } catch (error) {
          console.error(error)
          toast.error('Nu s-a putut genera previzualizarea.')
          setViewMode('config') // Ne întoarcem dacă e eroare
        } finally {
          setIsLoadingPreview(false)
        }
      }

      fetchPreview()
    }
  }, [viewMode, isValid, rows, originalItems, currency])

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
                    grandTotal,
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

          {viewMode === 'preview' && (
            <div className='p-6 h-full flex flex-col relative min-h-[300px]'>
              {/* Loader Overlay */}
              {isLoadingPreview && (
                <div className='absolute inset-0 bg-background/80 z-50 flex items-center justify-center backdrop-blur-sm'>
                  <div className='flex flex-col items-center gap-2'>
                    <Loader2 className='h-8 w-8 animate-spin text-primary' />
                    <p className='text-sm text-muted-foreground'>
                      Se calculează distribuția...
                    </p>
                  </div>
                </div>
              )}

              {!isLoadingPreview && previewData && (
                <Tabs
                  value={activePreviewTab}
                  onValueChange={setActivePreviewTab}
                  className='w-full h-full flex flex-col'
                >
                  <TabsList className='w-full justify-start overflow-x-auto h-auto p-2 bg-muted/50 mb-4 shrink-0'>
                    {previewData.map((inv) => (
                      <TabsTrigger
                        key={inv.clientId}
                        value={inv.clientId || ''}
                        className='px-4 py-2 h-auto flex flex-col items-start gap-1 cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm'
                      >
                        <div className='font-semibold text-sm truncate max-w-[250px] '>
                          {rows.find((r) => r.clientId === inv.clientId)
                            ?.clientName || 'Client'}
                        </div>
                        <div className='text-xs font-mono flex items-center gap-2 mt-1'>
                          <span className='text-muted-foreground'>
                            {formatCurrency(inv.totals.grandTotal)}
                          </span>
                          <span
                            className={
                              Math.abs(
                                (inv.totals.grandTotal / grandTotal) * 100 -
                                  (rows.find((r) => r.clientId === inv.clientId)
                                    ?.percentage || 0),
                              ) < 0.5
                                ? 'text-green-600 font-bold'
                                : 'text-red-500 font-bold'
                            }
                          >
                            (
                            {(
                              (inv.totals.grandTotal / grandTotal) *
                              100
                            ).toFixed(2)}
                            %)
                          </span>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {previewData.map((inv) => (
                    <TabsContent
                      key={inv.clientId}
                      value={inv.clientId || ''}
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
                              <TableHead className='px-4 py-3 text-left font-medium h-auto text-muted-foreground w-[30%]'>
                                Produs
                              </TableHead>
                              <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                                Cotă Reală
                              </TableHead>

                              <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                                Cantitate
                              </TableHead>
                              <TableHead className='px-4 py-3 text-right font-medium h-auto text-muted-foreground'>
                                UM
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
                              // Căutăm itemul original pentru a compara valorile
                              const originalItem = originalItems.find(
                                (oi) => oi.productName === item.productName,
                              )
                              const originalTotal = originalItem
                                ? originalItem.lineTotal
                                : 0

                              const realPercentage =
                                originalTotal !== 0
                                  ? (item.lineTotal / originalTotal) * 100
                                  : 0

                              // Găsim procentul ȚINTĂ (din configurație) pentru a colora
                              const targetRow = rows.find(
                                (r) => r.clientId === inv.clientId,
                              )
                              const targetPercentage =
                                targetRow?.percentage || 0
                              // Toleranță mai mare (1%) pentru că "gap filling" poate devia procentele pe liniile individuale
                              // (scopul e totalul general, nu linia individuală)
                              const isMatch =
                                Math.abs(realPercentage - targetPercentage) < 5
                              const colorClass = isMatch
                                ? 'text-green-600'
                                : 'text-red-500'

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
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className='px-4 py-3 text-right font-mono text-xs text-muted-foreground '>
                                    {item.unitOfMeasure}
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
              )}
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
                  disabled={isSubmitting || isLoadingPreview}
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
