'use client'

import { useState } from 'react'
import {
  PopulatedSupplierPayment,
  SupplierAllocationModal,
} from '../components/SupplierAllocationModal'
import { SupplierPaymentsTable } from '../components/SupplierPaymentsTable'

interface WrapperProps {
  initialData: {
    data: PopulatedSupplierPayment[]
    totalPages: number
    total: number
  }
}

export function SupplierPaymentListWrapper({ initialData }: WrapperProps) {
  const [allocationModalPayment, setAllocationModalPayment] =
    useState<PopulatedSupplierPayment | null>(null)

  return (
    <>
      <SupplierPaymentsTable
        data={initialData}
        onOpenAllocationModal={setAllocationModalPayment}
      />

      {/* Modal Alocare Plată */}
      <SupplierAllocationModal
        payment={allocationModalPayment}
        onClose={() => setAllocationModalPayment(null)}
      />
    </>
  )
}
