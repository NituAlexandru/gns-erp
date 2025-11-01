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

interface SelectSeriesModalProps {
  documentType: DocumentType
  onSelect: (seriesName: string) => void
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

            <div className='flex justify-end gap-2'>
              <Button variant='secondary' onClick={onCancel}>
                Anulează
              </Button>
              <Button
                disabled={!selected}
                onClick={() => selected && onSelect(selected)}
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
