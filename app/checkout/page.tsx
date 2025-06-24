import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import OrderForm from './order-form'

export default async function CheckoutPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/checkout')
  }
  return <OrderForm />
}
