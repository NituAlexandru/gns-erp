'use client'

import { ReceivablesList } from '@/app/admin/management/incasari-si-plati/receivables/components/ReceivablesList'
import { PopulatedClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'

interface WrapperProps {
  data: {
    data: PopulatedClientPayment[]
    pagination: {
      total: number
      page: number
      totalPages: number
    }
  }
  isAdmin: boolean
}

export function PublicReceivablesListWrapper({ data, isAdmin }: WrapperProps) {
  const handleOpenModalDummy = () => {}

  return (
    <ReceivablesList
      data={data}
      isAdmin={isAdmin}
      onOpenAllocationModal={handleOpenModalDummy}
    />
  )
}
