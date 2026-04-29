'use client'

import { useState } from 'react'
import {
  PopulatedSupplierPayment,
  SupplierAllocationModal,
} from '../components/SupplierAllocationModal'
import { SupplierPaymentsTable } from '../components/SupplierPaymentsTable'
import { SupplierRefundAllocationSheet } from '../components/SupplierRefundAllocationSheet'

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
  const [refundModalPayment, setRefundModalPayment] =
    useState<PopulatedSupplierPayment | null>(null)

  return (
    <>
      <SupplierPaymentsTable
        data={initialData}
        onOpenAllocationModal={setAllocationModalPayment}
        onOpenRefundModal={setRefundModalPayment}
      />

      {/* Modal Alocare Plată */}
      <SupplierAllocationModal
        payment={allocationModalPayment}
        onClose={() => setAllocationModalPayment(null)}
      />
      {/* Sheet pentru Alocare Restituire pe Avans */}
      <SupplierRefundAllocationSheet
        refundPayment={refundModalPayment}
        onClose={() => setRefundModalPayment(null)}
      />
    </>
  )
}
