'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getActiveSeriesForDocumentType } from '@/lib/db/modules/numbering/numbering.actions'
import type { DocumentType } from '@/lib/db/modules/numbering/documentCounter.model'
import type { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface SelectSeriesModalProps {
  documentType: DocumentType
  onSelect: (seriesName: string, manualNumber?: string) => void
  onCancel?: () => void
}

export function SelectSeriesModal({
  documentType,
  onSelect,
  onCancel,
}: SelectSeriesModalProps) {
  const [seriesList, setSeriesList] = useState<SeriesDTO[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualNumber, setManualNumber] = useState('')
  const MANUAL_SERIES = ['GMD-M']

  useEffect(() => {
    const loadSeries = async () => {
      setLoading(true)
      try {
        //eslint-disable-next-line
        const list = await getActiveSeriesForDocumentType(documentType as any)
        setSeriesList(list)
      } catch (err) {
        console.error('❌ Eroare la încărcarea seriilor:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSeries()
  }, [documentType])

  useEffect(() => {
    setManualNumber('')
  }, [selected])

  const handleConfirm = () => {
    if (!selected) return

    // Dacă seria e în lista MANUAL_SERIES, trimitem și numărul
    if (MANUAL_SERIES.includes(selected)) {
      onSelect(selected, manualNumber)
    } else {
      onSelect(selected)
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Alege seria pentru {documentType}</DialogTitle>
          <DialogDescription>
            Există mai multe serii active pentru acest document. Te rog să
            selectezi una pentru a continua.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className='text-center py-6'>Se încarcă...</p>
        ) : seriesList.length === 0 ? (
          <p className='text-center py-6 text-muted-foreground'>
            Nu există serii active pentru acest tip de document.
          </p>
        ) : (
          <div className='space-y-4'>
            <Select onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder='Selectează seria' />
              </SelectTrigger>
              <SelectContent>
                {seriesList.map((s) => (
                  <SelectItem key={s._id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected && MANUAL_SERIES.includes(selected) && (
              <div className='space-y-2 pt-2 animate-in fade-in zoom-in duration-300'>
                <Label className='text-red-500 font-semibold'>
                  Introdu Numărul Avizului (Manual)
                </Label>
                <Input
                  placeholder='Ex: 105'
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  autoFocus
                />
                <p className='text-xs text-muted-foreground'>
                  Această serie necesită introducerea manuală a numărului.
                </p>
              </div>
            )}

            <div className='flex justify-end gap-2'>
              <Button variant='secondary' onClick={onCancel}>
                Anulează
              </Button>
              <Button
                disabled={
                  !selected ||
                  (!!selected && // <--- Am adăugat !! aici pentru a forța tipul boolean
                    MANUAL_SERIES.includes(selected) &&
                    !manualNumber.trim())
                }
                onClick={handleConfirm}
              >
                Confirmă
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
