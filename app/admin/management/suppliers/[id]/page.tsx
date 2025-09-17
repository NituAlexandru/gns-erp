import React from 'react'
import { auth } from '@/auth'
import EditSupplierView from './edit-view'
import { getSupplierById } from '@/lib/db/modules/suppliers/supplier.actions'

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  const allowedRoles = ['Administrator', 'Admin', 'Manager']

  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error(
      'Nu aveți permisiunea necesară pentru a accesa această pagină.'
    )
  }
  const { id } = await params
  const supplier = await getSupplierById(id)

  return <EditSupplierView initialValues={supplier} />
}
