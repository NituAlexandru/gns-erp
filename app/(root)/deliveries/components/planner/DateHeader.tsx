'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { format, addDays, startOfDay, isWeekend } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'

interface DateHeaderProps {
  selectedDate: Date
}

export function DateHeader({ selectedDate }: DateHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // --- Generăm următoarele 7 ZILE LUCRĂTOARE ---
  const dateInterval = useMemo(() => {
    const days: Date[] = []
    let currentDate = startOfDay(new Date()) // Începem de azi

    while (days.length < 7) {
      // Adăugăm data în listă DOAR dacă NU este weekend
      if (!isWeekend(currentDate)) {
        days.push(currentDate)
      }
      // Trecem la ziua următoare
      currentDate = addDays(currentDate, 1)
    }
    return days
  }, [])
  // 2. Funcție pentru navigare
  const handleDateChange = (date: Date) => {
    // Formatăm data ca YYYY-MM-DD pentru URL
    const dateString = format(date, 'yyyy-MM-dd')
    // Actualizăm URL-ul cu noul searchParam
    router.push(`${pathname}?date=${dateString}`)
  }

  // 3. Funcție pentru calendar
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      handleDateChange(date)
      setIsCalendarOpen(false)
    }
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      {/* Butoanele cu 7 zile */}
      <div className='flex flex-wrap gap-1'>
        {dateInterval.map((date) => {
          const isSelected =
            format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
          return (
            <Button
              key={date.toString()}
              variant={isSelected ? 'default' : 'outline'}
              className='flex flex-row h-auto px-3 py-2 w-28 items-center justify-center'
              onClick={() => handleDateChange(date)}
            >
              <span className='font-semibold text-sm'>
                {format(date, 'EEEE', { locale: ro })}
              </span>

              <span className='text-xs'>
                {format(date, 'dd MMM ', { locale: ro })}
              </span>
            </Button>
          )
        })}
      </div>

      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium text-muted-foreground'>
          Data selectată: {format(selectedDate, 'PPP', { locale: ro })}
        </span>
        {/* Selectorul Calendar */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant={'outline'}>
              <CalendarIcon className='mr-2 h-4 w-4' />
              <span> Altă Dată</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='end'>
            <Calendar
              mode='single'
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              disabled={isWeekend}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button asChild variant='outline'>
          <Link href='/deliveries/list'>Vezi toate livrările</Link>
        </Button>
      </div>
    </div>
  )
}
