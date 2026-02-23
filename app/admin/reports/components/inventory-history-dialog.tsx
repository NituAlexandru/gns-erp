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
import { CalendarIcon, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'
import { format } from 'date-fns'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface InventoryHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function InventoryHistoryDialog({
  open,
  onOpenChange,
  report,
}: InventoryHistoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<string>('ALL')
  const [itemType, setItemType] = useState<string>('ALL')
  const [targetDate, setTargetDate] = useState<Date>(new Date())

  useEffect(() => {
    if (open) {
      setLocation('ALL')
      setItemType('ALL')
      setTargetDate(new Date())
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

    const filtersPayload = {
      location,
      itemType,
      targetDate: targetDate.toISOString(),
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
        toast.success('Raport istoric generat!')
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
          {/* Până la data */}
          <div className='grid gap-2'>
            <Label>Stoc calculat până la data de (inclusiv)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {targetDate ? (
                    format(targetDate, 'dd/MM/yyyy')
                  ) : (
                    <span>Alege data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={targetDate}
                  onSelect={(d) => d && setTargetDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            {/* Gestiune */}
            <div className='grid gap-2'>
              <Label>Gestiune</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder='Locație' />
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

            {/* Tip Articol */}
            <div className='grid gap-2'>
              <Label>Tip Articol</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger>
                  <SelectValue placeholder='Tip' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Toate</SelectItem>
                  <SelectItem value='ERPProduct'>Doar Produse</SelectItem>
                  <SelectItem value='Packaging'>Doar Ambalaje</SelectItem>
                </SelectContent>
              </Select>
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
