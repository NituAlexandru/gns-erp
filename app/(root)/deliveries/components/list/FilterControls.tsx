'use client'

import { useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

interface StatusOption {
  value: string
  label: string
}

interface FilterControlsProps {
  statuses: StatusOption[]
}

export default function FilterControls({ statuses }: FilterControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // -- LOGICĂ URL --
  const updateUrl = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Reset pagină la orice filtrare

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  // 1. Search Text (Debounce)
  const handleTextChange = (val: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      updateUrl('generalSearch', val)
    }, 500)
  }

  // 2. Date Selection (Range)
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

    if (newDate?.from)
      params.set('startDate', format(newDate.from, 'yyyy-MM-dd'))
    else params.delete('startDate')

    if (newDate?.to) params.set('endDate', format(newDate.to, 'yyyy-MM-dd'))
    else params.delete('endDate')

    router.replace(`${pathname}?${params.toString()}`)
  }

  // 3. Reset
  const handleReset = () => {
    router.replace(pathname)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card className='m-0 p-1'>
      <CardContent className='p-0'>
        <div className='flex flex-col lg:flex-row gap-4 items-center justify-between'>
          <div className='flex flex-col lg:flex-row gap-2 w-full lg:w-auto'>
            {/* 🔍 Căutare */}
            <Input
              ref={inputRef}
              placeholder='Caută client / nr. comandă...'
              defaultValue={searchParams.get('generalSearch')?.toString()}
              onChange={(e) => handleTextChange(e.target.value)}
              className='w-full lg:w-[300px]'
            />

            {/* ⚙️ Status */}
            <Select
              value={searchParams.get('status')?.toString() || 'all'}
              onValueChange={(val) => updateUrl('status', val)}
            >
              <SelectTrigger className='w-full lg:w-[200px]'>
                <SelectValue placeholder='Selectează status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Toate statusurile</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 📅 Dată */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full lg:w-[200px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, 'dd LLL y', { locale: ro })} -{' '}
                        {format(date.to, 'dd LLL y', { locale: ro })}
                      </>
                    ) : (
                      format(date.from, 'dd LLL y', { locale: ro })
                    )
                  ) : (
                    <span>Alege perioada</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='range'
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reset Button */}
          {searchParams.toString().length > 0 && (
            <Button
              variant='ghost'
              onClick={handleReset}
              title='Resetează filtrele'
            >
              <X className='h-4 w-4 mr-2' /> Resetează
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
