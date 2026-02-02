'use client'

import { DeliveriesTable } from './DeliveriesTable'
import type { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'

interface DeliveriesListProps {
  deliveries: IDelivery[]
  pagination: {
    totalCount: number
    currentPage: number
    totalPages: number
    pageSize: number
  }
  currentYearCount: number
}

export default function DeliveriesList({
  deliveries,
  pagination,
  currentYearCount,
}: DeliveriesListProps) {
  return (
    <DeliveriesTable
      deliveries={deliveries}
      pagination={pagination}
      currentYearCount={currentYearCount}
    />
  )
}
