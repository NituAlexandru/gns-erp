'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import type { ReceptionFilters } from '@/lib/db/modules/reception/types'
import { TIMEZONE } from '@/lib/constants'
import { DateRange } from 'react-day-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CalendarIcon } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'

interface Props {
  initial?: Partial<ReceptionFilters> & { dateType?: string }
  onChange: (filters: ReceptionFilters & { dateType?: string }) => void
}

export function SearchFilters({ initial = {}, onChange }: Props) {
  const [q, setQ] = useState(initial.q ?? '')
  const [users, setUsers] = useState<{ _id: string; name: string }[]>([])
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (initial.from) {
      return {
        from: new Date(initial.from),
        to: initial.to ? new Date(initial.to) : undefined,
      }
    }
    return undefined
  })
  useEffect(() => {
    setQ(initial.q ?? '')
  }, [initial.q])

  // Încărcăm userii (asta e OK)
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setUsers(list)
      })
      .catch(console.error)
  }, [])

  // --- LOGICA DEBOUNCE PENTRU SEARCH (TEXT) ---
  useEffect(() => {
    if (q === (initial.q ?? '')) return

    const timer = setTimeout(() => {
      onChange({
        ...initial,
        q,
        page: 1,
      } as ReceptionFilters)
    }, 500)

    return () => clearTimeout(timer)
  }, [q, initial, onChange])

  // --- HANDLERS PENTRU DROPDOWNS (IMEDIAT) ---
  const handleStatusChange = (val: string) => {
    onChange({
      ...initial,
      status: val,
      page: 1,
    } as ReceptionFilters)
  }

  const handleUserChange = (val: string) => {
    onChange({
      ...initial,
      createdBy: val,
      page: 1,
    } as ReceptionFilters)
  }

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)

    if (newDate?.from) {
      // Folosim formatInTimeZone + TIMEZONE pentru a fi siguri de data corectă
      const fromStr = formatInTimeZone(newDate.from, TIMEZONE, 'yyyy-MM-dd')

      const toStr = newDate.to
        ? formatInTimeZone(newDate.to, TIMEZONE, 'yyyy-MM-dd')
        : ''

      onChange({
        ...initial,
        from: fromStr,
        to: toStr,
        page: 1,
      } as any)
    } else {
      // Resetare
      onChange({
        ...initial,
        from: '',
        to: '',
        page: 1,
      } as any)
    }
  }

  const handleDateTypeChange = (val: string) => {
    onChange({
      ...initial,
      dateType: val,
      page: 1,
    } as any)
  }

  return (
    <div className='flex flex-wrap gap-4'>
      {/* Free-text search */}
      <div className='flex-1 min-w-[300px]'>
        <Input
          aria-label='Caută după furnizor, dată, aviz, factură, total'
          placeholder='Furnizor, dată, aviz, factură, total'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Status dropdown */}
      <div className='min-w-[160px]'>
        <Select
          value={initial.status || 'ALL'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger aria-label='Filtrează după status' className='w-full'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate stările</SelectItem>
            <SelectItem value='DRAFT'>Draft</SelectItem>
            <SelectItem value='CONFIRMAT'>Confirmat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Created by dropdown */}
      <div className='min-w-[160px]'>
        <Select
          value={initial.createdBy || 'ALL'}
          onValueChange={handleUserChange}
        >
          <SelectTrigger
            aria-label='Filtrează după utilizator'
            className='w-full'
          >
            <SelectValue placeholder='Creat de' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Oricine</SelectItem>
            {users.map((u) => (
              <SelectItem key={u._id} value={u._id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='min-w-[140px]'>
        <Select
          value={initial.dateType || 'reception'}
          onValueChange={handleDateTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder='Tip Dată' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='reception'>Data Recepție</SelectItem>
            <SelectItem value='invoice'>Data Factură</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Date Range Picker */}
      <div className={cn('grid gap-2', 'min-w-[240px]')}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id='date'
              variant={'outline'}
              className={cn(
                'w-full justify-start text-left font-normal truncate',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {date?.from ? (
                date.to ? (
                  <>
                    {formatInTimeZone(date.from, TIMEZONE, 'dd/MM/yyyy')} -{' '}
                    {formatInTimeZone(date.to, TIMEZONE, 'dd/MM/yyyy')}
                  </>
                ) : (
                  formatInTimeZone(date.from, TIMEZONE, 'dd/MM/yyyy')
                )
              ) : (
                <span>Filtrează după dată</span>
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
              locale={undefined}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
