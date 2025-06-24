import { notFound } from 'next/navigation'
import React from 'react'
// import { auth } from '@/auth'
import { getOrderById } from '@/lib/actions/order.actions'
// import OrderDetailsForm from '@/components/shared/order/order-details-form'
import Link from 'next/link'
import { formatId } from '@/lib/utils'
// import PrintButton from '@/components/shared/print-button'

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params

  return {
    title: `Comanda ${formatId(params.id)}`,
  }
}

export default async function OrderDetailsPage(props: {
  params: Promise<{
    id: string
  }>
}) {
  const params = await props.params

  const { id } = params

  const order = await getOrderById(id)
  if (!order) notFound()

  // const session = await auth()
  // const isAdmin = session?.user?.role === 'Admin' || false

  return (
    <>
      <div className='flex gap-2'>
        <Link href='/account'>Contul tău</Link>
        <span>›</span>
        <Link href='/account/orders'>Comenzile tale</Link>
        <span>›</span>
        <span>Comanda {formatId(order._id)}</span>
      </div>

      <div className='printable'>
        {' '}
        <div className='flex items-center justify-between py-4'>
          <h1 className='h1-bold m-0'>Comanda - {order._id}</h1>
          <div className='print-btn'>
            {/* <PrintButton /> */}
          </div>
        </div>
        {/* <OrderDetailsForm order={order} isAdmin={isAdmin} /> */}
      </div>
    </>
  )
}
