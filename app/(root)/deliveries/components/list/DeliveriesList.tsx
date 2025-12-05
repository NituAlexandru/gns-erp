'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getFilteredDeliveries } from '@/lib/db/modules/deliveries/delivery.actions'
import { DeliveriesTable } from './DeliveriesTable'
import type { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'

export default function DeliveriesList() {
  const searchParams = useSearchParams()
  const [deliveries, setDeliveries] = useState<IDelivery[]>([])
  const [pagination, setPagination] = useState<{
    totalCount: number
    currentPage: number
    totalPages: number
    pageSize: number
  }>({ totalCount: 0, currentPage: 1, totalPages: 1, pageSize: 0 })
  const [loading, setLoading] = useState(false)
  const [currentYearCount, setCurrentYearCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getFilteredDeliveries({
        search: searchParams.get('generalSearch') || undefined,
        status: searchParams.get('status') || undefined,
        date: searchParams.get('date') || undefined,
        page: Number(searchParams.get('page')) || 1,
      })
      setDeliveries(result.data)
      setPagination(result.pagination)
      setCurrentYearCount(result.currentYearCount)
      setLoading(false)
    }
    fetchData()
  }, [searchParams])

  if (loading) {
    return (
      <p className='text-center text-muted-foreground py-4'>
        Se încarcă livrările...
      </p>
    )
  }

  return (
    <DeliveriesTable
      deliveries={deliveries}
      pagination={pagination}
      currentYearCount={currentYearCount}
    />
  )
}
