'use client'

import { useState, useEffect } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  parseISO,
} from 'date-fns'
import {
  Calendar as CalendarIcon,
  Loader2,
  PackageSearch,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { ReportDefinition } from '@/lib/db/modules/reports/reports.types'
import { generateReportAction } from '@/lib/db/modules/reports/reports.actions'
import { searchStockableItems } from '@/lib/db/modules/product/product.actions'
import { SearchedProduct } from '@/lib/db/modules/product/types'
import { useDebounce } from '@/hooks/use-debounce'

// IMPORTUL PENTRU REUTILIZAREA COMPONENTEI DE SEARCH (ajustează calea dacă diferă)
import { SearchResultItem } from '@/app/(root)/orders/components/mini-components/SearchResultItem'

interface ProductHistoryReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportDefinition | null
}

export function ProductHistoryReportDialog({
  open,
  onOpenChange,
  report,
}: ProductHistoryReportDialogProps) {
  const [loading, setLoading] = useState(false)

  // Filtre Perioadă
  const [period, setPeriod] = useState<string>('this-month')
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )

  // State pentru căutare produs
  const [itemPopoverOpen, setItemPopoverOpen] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [itemSearchResults, setItemSearchResults] = useState<SearchedProduct[]>(
    [],
  )
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const debouncedItemSearch = useDebounce(itemSearchTerm, 300)

  const [selectedProduct, setSelectedProduct] =
    useState<SearchedProduct | null>(null)

  useEffect(() => {
    if (open) {
      setPeriod('this-month')
      setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
      setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
      setSelectedProduct(null)
      setItemSearchTerm('')
    }
  }, [open])

  // Căutare debounced
  useEffect(() => {
    async function fetchItems() {
      if (debouncedItemSearch.length < 2) {
        setItemSearchResults([])
        return
      }
      setIsLoadingItems(true)
      try {
        const items = await searchStockableItems(debouncedItemSearch)
        setItemSearchResults(items)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoadingItems(false)
      }
    }
    fetchItems()
  }, [debouncedItemSearch])

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    const now = new Date()
    switch (value) {
      case 'today':
        setDateFrom(format(startOfDay(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfDay(now), 'yyyy-MM-dd'))
        break
      case 'this-week':
        setDateFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        setDateTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        break
      case 'this-month':
        setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'))
        break
      case 'this-year':
        setDateFrom(format(startOfYear(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfYear(now), 'yyyy-MM-dd'))
        break
    }
  }

  const handleManualDateChange = (
    type: 'from' | 'to',
    date: Date | undefined,
  ) => {
    if (!date) return
    const formatted = format(date, 'yyyy-MM-dd')
    if (type === 'from') setDateFrom(formatted)
    else setDateTo(formatted)
  }

  const handleGenerate = async () => {
    if (!report) return
    if (!selectedProduct) {
      toast.error('Vă rugăm să selectați un produs pentru a genera istoricul.')
      return
    }

    setLoading(true)

    const filtersPayload = {
      startDate: dateFrom,
      endDate: dateTo,
      productId: selectedProduct._id,
      itemType: selectedProduct.itemType,
      productName: selectedProduct.name,
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
        toast.success('Istoric generat cu succes!')
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

  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Am mărit lățimea dialogului la 700px pentru a avea loc componentele */}
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-6 py-4'>
          {/* TABURI PERIOADĂ */}
          <div className='space-y-2 '>
            <Label>Perioadă Raport</Label>
            <Tabs
              value={period}
              onValueChange={handlePeriodChange}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-4'>
                <TabsTrigger value='today'>Astăzi</TabsTrigger>
                <TabsTrigger value='this-week'>Săpt. Curentă</TabsTrigger>
                <TabsTrigger value='this-month'>Luna Curentă</TabsTrigger>
                <TabsTrigger value='this-year'>Anul Curent</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* DATE PICKERS */}
          <div className='flex items-center gap-4 justify-between'>
            <div className='grid gap-1.5'>
              <Label className='text-xs'>De la</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[160px] justify-start text-left font-normal text-xs',
                      !dateFrom && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className='mr-2 h-3 w-3' />
                    {dateFrom ? (
                      format(parseISO(dateFrom), 'dd/MM/yyyy')
                    ) : (
                      <span>Alege</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={parseISO(dateFrom)}
                    onSelect={(d) => handleManualDateChange('from', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <span className='mt-4'>-</span>

            <div className='grid gap-1.5'>
              <Label className='text-xs'>Până la</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[160px] justify-start text-left font-normal text-xs',
                      !dateTo && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className='mr-2 h-3 w-3' />
                    {dateTo ? (
                      format(parseISO(dateTo), 'dd/MM/yyyy')
                    ) : (
                      <span>Alege</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='single'
                    selected={parseISO(dateTo)}
                    onSelect={(d) => handleManualDateChange('to', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* SELECTOR PRODUS */}
          <div className='space-y-2'>
            <Label>Produs / Ambalaj Analizat</Label>
            {selectedProduct ? (
              <div className='flex items-center justify-between p-3 border rounded-md bg-muted/30'>
                <span className='font-medium text-sm'>
                  {selectedProduct.name}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setSelectedProduct(null)}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ) : (
              <Popover
                open={itemPopoverOpen}
                onOpenChange={setItemPopoverOpen}
                modal={true}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className='w-full justify-start text-left font-normal'
                  >
                    <PackageSearch className='mr-2 h-4 w-4' />
                    Caută produs...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[800px] p-0' align='start'>
                  <Command className='bg-white dark:bg-muted'>
                    <CommandInput
                      placeholder='Tastează minim 2 caractere...'
                      value={itemSearchTerm}
                      onValueChange={setItemSearchTerm}
                    />
                    <CommandList className='max-h-[450px] overflow-y-auto overscroll-contain'>
                      {isLoadingItems && (
                        <div className='p-4 text-sm text-center'>
                          Se caută...
                        </div>
                      )}
                      {!isLoadingItems &&
                        !itemSearchResults.length &&
                        debouncedItemSearch.length > 1 && (
                          <CommandEmpty>Niciun articol găsit.</CommandEmpty>
                        )}
                      <CommandGroup>
                        {itemSearchResults.map((item) => (
                          <CommandItem
                            key={item._id}
                            value={`${item.name} ${item.productCode}`}
                            onSelect={() => {
                              setSelectedProduct(item)
                              setItemPopoverOpen(false)
                            }}
                            className='p-2 cursor-pointer'
                          >
                            <SearchResultItem item={item} isAdmin={true} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
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
          <Button
            onClick={handleGenerate}
            disabled={loading || !selectedProduct}
          >
            {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Generează Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
