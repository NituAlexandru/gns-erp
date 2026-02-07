'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'

interface InventoryReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function InventoryReportDialog({
  open,
  onOpenChange,
  report,
}: InventoryReportDialogProps) {
  const [loading, setLoading] = useState(false)

  // FĂRĂ DATE RANGE. Doar locație, tip și zero stock.
  const [location, setLocation] = useState<string>('ALL')
  const [itemType, setItemType] = useState<string>('ALL')
  const [includeZeroStock, setIncludeZeroStock] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      setLocation('ALL')
      setItemType('ALL')
      setIncludeZeroStock(false)
    }
  }, [open])

  if (!report) return null

  const locationOptions = [
    { value: 'ALL', label: 'Toate Gestiunile' },
    ...Object.entries(LOCATION_NAMES_MAP).map(([key, label]) => ({
      value: key,
      label: label,
    })),
  ]

  const handleGenerate = async () => {
    setLoading(true)

    // Trimitem doar ce contează pentru stocul la zi
    const filtersPayload = {
      location,
      itemType,
      includeZeroStock,
    }

    try {
      const result = await generateReportAction(report.id, filtersPayload)

      if (result.success && result.data && result.filename) {
        const byteCharacters = atob(result.data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        saveAs(blob, result.filename)
        toast.success('Raport de stoc generat!')
        onOpenChange(false)
      } else {
        toast.error(result.message || 'Eroare la generare.')
      }
    } catch (err) {
      console.error(err)
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 py-4'>
          {/* 1. LOCAȚIE */}
          <div className='grid gap-2'>
            <Label>Gestiune</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder='Selectează locația' />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. TIP ARTICOL */}
          <div className='grid gap-2'>
            <Label>Tip Articol</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger>
                <SelectValue placeholder='Selectează tipul' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Toate (Mixte)</SelectItem>
                <SelectItem value='ERPProduct'>Doar Produse</SelectItem>
                <SelectItem value='Packaging'>Doar Ambalaje</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. STOC ZERO */}
          <div className='flex items-center space-x-2 border p-3 rounded-md bg-muted/20'>
            <Checkbox
              id='zeroStock'
              checked={includeZeroStock}
              onCheckedChange={(checked) =>
                setIncludeZeroStock(checked as boolean)
              }
            />
            <div className='grid gap-1.5 leading-none'>
              <Label
                htmlFor='zeroStock'
                className='text-sm font-medium leading-none cursor-pointer'
              >
                Include produse cu stoc 0
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Anulează
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Generează Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
