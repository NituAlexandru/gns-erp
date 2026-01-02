'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Search, X, Calendar as CalendarIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function ReceiptsFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // --- 1. SEARCH STATE ---
  const [text, setText] = useState(searchParams.get('search') || '')
  const debouncedText = useDebounce(text, 500)

  // --- 2. DATE STATE ---
  // Inițializăm data din URL dacă există
  const initialDate: DateRange | undefined =
    searchParams.get('startDate') && searchParams.get('endDate')
      ? {
          from: new Date(searchParams.get('startDate')!),
          to: new Date(searchParams.get('endDate')!),
        }
      : undefined

  const [date, setDate] = useState<DateRange | undefined>(initialDate)

  // --- 3. EFFECT: Actualizare URL ---
  useEffect(() => {
    const params = new URLSearchParams(searchParams)

    // A. Gestionare Text (Search)
    const currentSearchInUrl = params.get('search') || ''
    if (debouncedText !== currentSearchInUrl) {
      if (debouncedText) {
        params.set('search', debouncedText)
        params.set('page', '1')
      } else {
        params.delete('search')
      }
    }

    // B. Gestionare Dată
    const currentStart = params.get('startDate')
    const currentEnd = params.get('endDate')

    if (date?.from && date?.to) {
      // Avem un interval selectat
      const newStart = date.from.toISOString()
      const newEnd = date.to.toISOString()

      // Actualizăm doar dacă e diferit de ce e în URL
      if (newStart !== currentStart || newEnd !== currentEnd) {
        params.set('startDate', newStart)
        params.set('endDate', newEnd)
        params.set('page', '1')
      }
    } else if (!date) {
      // S-a șters data (sau e undefined)
      if (currentStart || currentEnd) {
        params.delete('startDate')
        params.delete('endDate')
      }
    }

    // Facem replace doar dacă parametrii s-au schimbat față de URL-ul actual
    if (params.toString() !== searchParams.toString()) {
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [debouncedText, date, pathname, router, searchParams])

  return (
    <div className='flex flex-col md:flex-row gap-2 items-center w-full md:w-auto'>
      {/* 1. INPUT CĂUTARE */}
      <div className='relative w-full md:w-[250px]'>
        <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Caută...'
          className='pl-8 bg-background'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text && (
          <button
            onClick={() => setText('')}
            className='absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* 2. DATE RANGE PICKER */}
      <div className='grid gap-2 w-full md:w-auto'>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id='date'
              variant={'outline'}
              className={cn(
                'w-full md:w-[260px] justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'dd MMM y', { locale: ro })} -{' '}
                    {format(date.to, 'dd MMM y', { locale: ro })}
                  </>
                ) : (
                  format(date.from, 'dd MMM y', { locale: ro })
                )
              ) : (
                <span>Selectează perioada</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              initialFocus
              mode='range'
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={ro}
            />
            {/* Buton de Resetare Dată */}
            <div className='p-2 border-t flex justify-end'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setDate(undefined)}
                disabled={!date}
              >
                Resetează Data
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
