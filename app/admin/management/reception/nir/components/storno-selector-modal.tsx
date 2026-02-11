'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Loader2,
  Search,
  Truck,
  FileText,
  Check,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import {
  searchDeliveryNotesForStorno,
  searchSupplierInvoicesForStorno,
} from '@/lib/db/modules/financial/nir/storno.actions'

interface StornoSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deliveryNoteId: string, supplierInvoiceId?: string) => void
}

export function StornoSelectorModal({
  isOpen,
  onClose,
  onConfirm,
}: StornoSelectorModalProps) {
  const [step, setStep] = useState<1 | 2>(1)

  // Stare Pas 1: Avize
  const [noteQuery, setNoteQuery] = useState('')
  const [notes, setNotes] = useState<any[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [loadingNotes, setLoadingNotes] = useState(false)

  // Stare Pas 2: Facturi
  const [invoiceQuery, setInvoiceQuery] = useState('')
  const [invoices, setInvoices] = useState<any[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  )
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [skipInvoice, setSkipInvoice] = useState(false)

  // --- NATIVE DEBOUNCE PENTRU AVIZE ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!noteQuery || noteQuery.length < 2) {
        setNotes([])
        return
      }
      setLoadingNotes(true)
      const res = await searchDeliveryNotesForStorno(noteQuery)
      if (res.success) {
        setNotes(res.data || [])
      } else {
        toast.error('Eroare: ' + res.message)
      }
      setLoadingNotes(false)
    }, 500) // Așteaptă 500ms după ce te oprești din tastat

    return () => clearTimeout(timer)
  }, [noteQuery])

  // --- NATIVE DEBOUNCE PENTRU FACTURI ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!invoiceQuery || invoiceQuery.length < 2) {
        setInvoices([])
        return
      }
      setLoadingInvoices(true)
      const res = await searchSupplierInvoicesForStorno(invoiceQuery)
      if (res.success) {
        setInvoices(res.data || [])
      } else {
        toast.error('Eroare: ' + res.message)
      }
      setLoadingInvoices(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [invoiceQuery])

  // --- CONFIRMARE FINALĂ ---
  const handleFinalConfirm = () => {
    if (!selectedNoteId) return
    const invId = skipInvoice ? undefined : selectedInvoiceId || undefined
    onConfirm(selectedNoteId, invId)
    onClose()
  }

  // Resetare la închidere
  const handleClose = () => {
    setStep(1)
    setNoteQuery('')
    setInvoiceQuery('')
    setNotes([])
    setInvoices([])
    setSelectedNoteId(null)
    setSelectedInvoiceId(null)
    setSkipInvoice(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-2xl flex flex-col max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? 'Pasul 1: Selectează Avizul de Retur'
              : 'Pasul 2: Asociază Factura Storno'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Caută avizul emis de tine către furnizor (după serie sau număr).'
              : 'Opțional: Caută factura storno primită de la furnizor.'}
          </DialogDescription>
        </DialogHeader>

        {/* --- CONȚINUT PAS 1 --- */}
        {step === 1 && (
          <div className='flex flex-col gap-4 py-2 flex-1 overflow-hidden'>
            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Caută aviz (ex: AV1234)...'
                className='pl-9'
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className='flex-1 overflow-y-auto border rounded-md min-h-[200px]'>
              {loadingNotes ? (
                <div className='flex justify-center items-center h-full p-4'>
                  <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                </div>
              ) : notes.length === 0 ? (
                <div className='text-center p-8 text-muted-foreground text-sm'>
                  {noteQuery.length < 2
                    ? 'Introdu minim 2 caractere.'
                    : 'Nu s-au găsit avize nefacturate.'}
                </div>
              ) : (
                <RadioGroup
                  value={selectedNoteId || ''}
                  onValueChange={setSelectedNoteId}
                  className='p-2 gap-2'
                >
                  {notes.map((note) => (
                    <div
                      key={note._id}
                      className={`flex items-start space-x-3 p-3 rounded border transition-colors ${selectedNoteId === note._id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    >
                      <RadioGroupItem
                        value={note._id}
                        id={note._id}
                        className='mt-1'
                      />
                      <Label
                        htmlFor={note._id}
                        className='flex-1 cursor-pointer font-normal grid gap-1'
                      >
                        <div className='flex justify-between font-medium'>
                          <span className='flex items-center gap-2'>
                            <Truck className='h-3 w-3 text-muted-foreground' />
                            {note.number}
                          </span>
                          <span>{formatCurrency(note.total)}</span>
                        </div>
                        <div className='text-xs text-muted-foreground flex justify-between'>
                          <span>Client: {note.client}</span>
                          <span>
                            {format(new Date(note.date), 'dd.MM.yyyy')}
                          </span>
                        </div>
                        <Badge
                          variant='outline'
                          className='w-fit text-[10px] h-5 px-1'
                        >
                          {note.itemsCount} Articole
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>
        )}

        {/* --- CONȚINUT PAS 2 --- */}
        {step === 2 && (
          <div className='flex flex-col gap-4 py-2 flex-1 overflow-hidden'>
            <div className='bg-muted/30 p-3 rounded text-sm border flex justify-between items-center'>
              <span>
                Aviz selectat:{' '}
                <strong>
                  {notes.find((n) => n._id === selectedNoteId)?.number}
                </strong>
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setStep(1)}
                className='h-6 text-xs'
              >
                Schimbă
              </Button>
            </div>

            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Caută factura furnizor (ex: SERIA 123)...'
                className='pl-9'
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                disabled={skipInvoice}
                autoFocus
              />
            </div>

            <div className='flex items-center space-x-2 pb-2'>
              <input
                type='checkbox'
                id='skip'
                className='h-4 w-4 rounded border-gray-300'
                checked={skipInvoice}
                onChange={(e) => {
                  setSkipInvoice(e.target.checked)
                  if (e.target.checked) setSelectedInvoiceId(null)
                }}
              />
              <label
                htmlFor='skip'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Nu asocia o factură acum
              </label>
            </div>

            {!skipInvoice && (
              <div className='flex-1 overflow-y-auto border rounded-md min-h-[200px]'>
                {loadingInvoices ? (
                  <div className='flex justify-center items-center h-full p-4'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className='text-center p-8 text-muted-foreground text-sm'>
                    {invoiceQuery.length < 2
                      ? 'Introdu numărul facturii.'
                      : 'Nu s-au găsit facturi.'}
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedInvoiceId || ''}
                    onValueChange={setSelectedInvoiceId}
                    className='p-2 gap-2'
                  >
                    {invoices.map((inv) => (
                      <div
                        key={inv._id}
                        className={`flex items-start space-x-3 p-3 rounded border transition-colors ${selectedInvoiceId === inv._id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <RadioGroupItem
                          value={inv._id}
                          id={inv._id}
                          className='mt-1'
                        />
                        <Label
                          htmlFor={inv._id}
                          className='flex-1 cursor-pointer font-normal grid gap-1'
                        >
                          <div className='flex justify-between font-medium'>
                            <span className='flex items-center gap-2'>
                              <FileText className='h-3 w-3 text-muted-foreground' />
                              {inv.number}
                            </span>
                            <span>{formatCurrency(inv.total)}</span>
                          </div>
                          <div className='text-xs text-muted-foreground flex justify-between'>
                            <span>Furnizor: {inv.supplier}</span>
                            <span>
                              {format(new Date(inv.date), 'dd.MM.yyyy')}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className='flex justify-between items-center sm:justify-between w-full border-t pt-4'>
          <Button variant='ghost' onClick={handleClose}>
            Anulează
          </Button>

          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!selectedNoteId}>
              Continuă <ArrowRight className='ml-2 h-4 w-4' />
            </Button>
          ) : (
            <Button
              onClick={handleFinalConfirm}
              disabled={!skipInvoice && !selectedInvoiceId}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              <Check className='mr-2 h-4 w-4' />
              Încarcă NIR Storno
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
