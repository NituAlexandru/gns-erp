'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, Check, FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getAvailableReceptions } from '@/lib/db/modules/financial/nir/nir.actions'
import { Badge } from '@/components/ui/badge'

interface ReceptionSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (receptionIds: string[]) => void
}

export function ReceptionSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: ReceptionSelectorModalProps) {
  const [loading, setLoading] = useState(false)
  const [receptions, setReceptions] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Încărcăm datele când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      loadReceptions()
      setSelectedIds([]) // Resetăm selecția la deschidere
    }
  }, [isOpen])

  const loadReceptions = async () => {
    setLoading(true)
    const res = await getAvailableReceptions()
    if (res.success) {
      setReceptions(res.data || [])
    } else {
      toast.error('Eroare la încărcarea recepțiilor: ' + res.message)
    }
    setLoading(false)
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      // Dacă e deja selectat, îl scoatem
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }

      // Validare Furnizor: Dacă selectăm a doua recepție,
      // verificăm să fie de la același furnizor ca prima.
      if (prev.length > 0) {
        const firstSelected = receptions.find((r) => r._id === prev[0])
        const current = receptions.find((r) => r._id === id)

        if (firstSelected?.supplierName !== current?.supplierName) {
          toast.warning(
            `Nu poți selecta recepții de la furnizori diferiți! (${firstSelected?.supplierName} vs ${current?.supplierName})`,
          )
          return prev
        }
      }

      // Adăugăm la selecție
      return [...prev, id]
    })
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      toast.warning('Selectează cel puțin o recepție.')
      return
    }
    onSelect(selectedIds)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-6xl max-h-[80vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Selectează Recepțiile pentru NIR</DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-auto py-4'>
          {loading ? (
            <div className='flex justify-center items-center h-40'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : receptions.length === 0 ? (
            <div className='text-center py-10 text-muted-foreground'>
              Nu există recepții disponibile (confirmate și fără NIR).
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Nr. Recepție</TableHead>
                  <TableHead>Furnizor</TableHead>
                  <TableHead>Facturi</TableHead>
                  <TableHead className='text-right'>Valoare (RON)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receptions.map((rec) => {
                  const isSelected = selectedIds.includes(rec._id)
                  return (
                    <TableRow
                      key={rec._id}
                      className={
                        isSelected
                          ? 'bg-muted/50 cursor-pointer'
                          : 'cursor-pointer hover:bg-muted/50'
                      }
                      onClick={() => toggleSelection(rec._id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(rec._id)}
                          onClick={(e) => e.stopPropagation()}
                          className='cursor-pointer'
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(rec.date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell className='font-mono text-xs text-muted-foreground'>
                        {rec.number}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {rec.supplierName}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {rec.invoices && rec.invoices.length > 0 ? (
                            rec.invoices.map((inv: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant='outline'
                                className='text-[10px] h-5 px-1 font-normal bg-background'
                              >
                                <FileText className='w-3 h-3 mr-1 text-muted-foreground' />
                                {inv}
                              </Badge>
                            ))
                          ) : (
                            <span className='text-muted-foreground text-xs'>
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-right font-mono font-bold'>
                        {formatCurrency(rec.totalValue)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className='flex justify-between items-center border-t pt-4'>
          <div className='text-sm text-muted-foreground'>
            {selectedIds.length} recepții selectate
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={onClose}>
              Anulează
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
              <Check className='w-4 h-4 mr-2' />
              Încarcă Selecția
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
