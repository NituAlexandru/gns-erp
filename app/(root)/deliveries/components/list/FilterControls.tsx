
'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarIcon } from 'lucide-react'
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

function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

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
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState<Date | undefined>()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // stabilizăm query-ul ca string pentru deps
  const searchParamsString = useMemo(
    () => searchParams.toString(),
    [searchParams]
  )

  // sincronizează starea locală din URL
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    setSearch(params.get('generalSearch') || '')
    setStatus(params.get('status') || 'all')
    const d = params.get('date')
    setDate(d ? new Date(d) : undefined)
  }, [searchParamsString])

  const debouncedSearch = useDebounce(search, 400)

  // actualizează URL când se schimbă filtrele (păstrăm page doar dacă nu s-au schimbat filtrele)
  useEffect(() => {
    const prev = new URLSearchParams(searchParamsString)
    const prevSearch = prev.get('generalSearch') || ''
    const prevStatus = prev.get('status') || 'all'
    const prevDate = prev.get('date') || ''

    const next = new URLSearchParams(prev.toString())

    if (debouncedSearch) next.set('generalSearch', debouncedSearch)
    else next.delete('generalSearch')

    if (status && status !== 'all') next.set('status', status)
    else next.delete('status')

    if (date) next.set('date', format(date, 'yyyy-MM-dd'))
    else next.delete('date')

    const nextSearch = next.get('generalSearch') || ''
    const nextStatus = next.get('status') || 'all'
    const nextDate = next.get('date') || ''

    const filtersChanged =
      prevSearch !== nextSearch ||
      prevStatus !== nextStatus ||
      prevDate !== nextDate

    if (filtersChanged) {
      next.set('page', '1')
    }

    const nextUrl = `${pathname}?${next.toString()}`
    const currentUrl = `${pathname}?${searchParamsString}`
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl)
    }
  }, [debouncedSearch, status, date, pathname, router, searchParamsString])

  const handleReset = () => {
    setSearch('')
    setStatus('all')
    setDate(undefined)

    const next = new URLSearchParams()
    next.set('page', '1')

    const nextUrl = `${pathname}?${next.toString()}`
    const currentUrl = `${pathname}?${searchParamsString}`
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl)
    }
  }

  return (
    <Card>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
          {/* 🔍 Căutare */}
          <Input
            placeholder='Caută client / nr. comandă / nr. livrare...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='lg:col-span-2'
          />

          {/* ⚙️ Status */}
          <div className='flex gap-2'>
            <label className='text-sm font-medium mt-2 text-muted-foreground block'>
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder='Selectează status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Toate</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 📅 Dată (zi unică pe deliveryDate) */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type='button'
                className={cn(
                  'w-full flex items-center justify-start border rounded-md px-3 py-2 text-sm text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className='mr-2 h-4 w-4' />
                {date ? (
                  format(date, 'PPP', { locale: ro })
                ) : (
                  <span>Alege o zi</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                selected={date}
                onSelect={(d) => {
                  setDate(d)
                  setIsCalendarOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant='outline' onClick={handleReset}>
            Resetează filtrele
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
