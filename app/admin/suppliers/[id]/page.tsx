import React from 'react'
import { auth } from '@/auth'
import { getSupplierById } from '@/lib/db/modules/suppliers'
import EditSupplierView from './edit-view'

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== 'Admin') {
    throw new Error('Permisiune Admin necesară')
  }
  const { id } = await params
  const supplier = await getSupplierById(id)
  return <EditSupplierView initialValues={supplier} />
}
