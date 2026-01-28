'use client'

import { ReceivablesList } from '@/app/admin/management/incasari-si-plati/receivables/components/ReceivablesList'
import { PopulatedClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'

interface WrapperProps {
  payments: PopulatedClientPayment[]
  isAdmin: boolean
}

export function PublicReceivablesListWrapper({
  payments,
  isAdmin,
}: WrapperProps) {
  const handleOpenModalDummy = () => {}

  const formattedData = {
    data: payments,
    pagination: {
      total: payments.length,
      page: 1,
      totalPages: 1,
    },
  }

  return (
    <ReceivablesList
      data={formattedData}
      isAdmin={isAdmin}
      onOpenAllocationModal={handleOpenModalDummy}
    />
  )
}
