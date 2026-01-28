'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReceivablesList } from './ReceivablesList'
import { AllocationModal, PopulatedClientPayment } from './AllocationModal'

interface ReceiptsListWrapperProps {
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

export function ReceiptsListWrapper({
  data,
  isAdmin,
}: ReceiptsListWrapperProps) {
  const router = useRouter()
  const [allocationModalPayment, setAllocationModalPayment] =
    useState<PopulatedClientPayment | null>(null)

  const handleOpenAllocationModal = (payment: PopulatedClientPayment) => {
    setAllocationModalPayment(payment)
  }

  const handleCloseAllocationModal = () => {
    setAllocationModalPayment(null)
    setTimeout(() => {
      router.refresh()
    }, 300)
  }

  return (
    <>
      <ReceivablesList
        data={data}
        isAdmin={isAdmin}
        onOpenAllocationModal={handleOpenAllocationModal}
      />

      <AllocationModal
        payment={allocationModalPayment}
        onClose={handleCloseAllocationModal}
        isAdmin={isAdmin}
      />
    </>
  )
}
