'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EFACTURA_STATUS_MAP,
  INVOICE_STATUS_MAP,
} from '@/lib/db/modules/financial/invoices/invoice.constants'
import { PlusCircle, X } from 'lucide-react'
import Link from 'next/link'
import { RefreshAnafButton } from './RefreshAnafButton'
import { useRef } from 'react'
import { format } from 'date-fns' // Asigură-te că ai 'date-fns' instalat
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface InvoicesFiltersProps {
  onBulkRefreshLoading?: (isLoading: boolean) => void
  availableSeries: string[]
}

export function InvoicesFilters({
  onBulkRefreshLoading,
  availableSeries,
}: InvoicesFiltersProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    replace(pathname)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const date: DateRange | undefined = {
    from: searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined,
    to: searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined,
  }

  const handleDateSelect = (newDate: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (newDate?.from) {
      params.set('startDate', format(newDate.from, 'yyyy-MM-dd'))
    } else {
      params.delete('startDate')
    }

    if (newDate?.to) {
      params.set('endDate', format(newDate.to, 'yyyy-MM-dd'))
    } else {
      params.delete('endDate')
    }

    replace(`${pathname}?${params.toString()}`)
  }

  const handleSearch = (term: string, key: string) => {
    const params = new URLSearchParams(searchParams)

    // Când filtrăm, resetăm mereu pagina la 1
    params.set('page', '1')

    if (term && term !== 'ALL') {
      params.set(key, term)
    } else {
      params.delete(key)
    }

    replace(`${pathname}?${params.toString()}`)
  }
  const handleTextChange = (term: string, key: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      handleSearch(term, key)
    }, 500)
  }

  return (
    <div className='flex flex-col xl:flex-row w-full items-start xl:items-center justify-between gap-2 overflow-hidden'>
      <div className='flex flex-col md:flex-row gap-2 '>
        {/* 1. Căutare text */}
        <Input
          placeholder='Caută Nr. Factură / Client...'
          defaultValue={searchParams.get('q')?.toString()}
          onChange={(e) => handleTextChange(e.target.value, 'q')}
          className='w-full sm:w-[250px] md:w-[190px] xl:w-[250px]'
          ref={inputRef}
        />
        {/* Date Range Picker Shadcn */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id='date'
              variant={'outline'}
              className={cn(
                'w-[150px] justify-start text-left font-normal',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'dd LLL, y')} -{' '}
                    {format(date.to, 'dd LLL, y')}
                  </>
                ) : (
                  format(date.from, 'dd LLL, y')
                )
              ) : (
                <span>Alege perioada</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              initialFocus
              mode='range'
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        {/* 2. Filtru după Status */}
        <Select
          value={searchParams.get('status')?.toString() || 'ALL'}
          onValueChange={(value) => handleSearch(value, 'status')}
        >
          <SelectTrigger className='w-full sm:w-[95px]'>
            <SelectValue placeholder='Toate statusurile' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Status</SelectItem>
            {Object.entries(INVOICE_STATUS_MAP).map(([key, { name }]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 3. Filtru după Status eFactura */}
        <Select
          value={searchParams.get('eFacturaStatus')?.toString() || 'ALL'}
          onValueChange={(value) => handleSearch(value, 'eFacturaStatus')}
        >
          <SelectTrigger className='w-full sm:w-[110px]'>
            <SelectValue placeholder='Status eFactura' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>eFactura</SelectItem>
            {Object.entries(EFACTURA_STATUS_MAP).map(([key, { name }]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get('series')?.toString() || 'ALL'}
          onValueChange={(value) => handleSearch(value, 'series')}
        >
          <SelectTrigger className='w-[90px]'>
            <SelectValue placeholder='Serie' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Serie</SelectItem>
            {availableSeries.map((serie) => (
              <SelectItem key={serie} value={serie}>
                {serie}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {searchParams.toString().length > 0 && (
          <Button
            variant='ghost'
            size='icon'
            onClick={handleReset}
            className='h-10 w-10 text-muted-foreground hover:text-foreground'
            title='Resetează Filtrele'
          >
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>

      <div className='flex gap-2 '>
        <RefreshAnafButton onLoadingChange={onBulkRefreshLoading} />
        <Button asChild>
          <Link href='/financial/invoices/new'>
            <PlusCircle className='w-4 h-4 mr-2' />
            Creează Factură
          </Link>
        </Button>
      </div>
    </div>
  )
}
