import { Metadata } from 'next'
import ProductList from './product-list'
import { auth } from '@/auth'

export const metadata: Metadata = {
  title: 'Admin Products',
}

export default async function AdminProduct() {
  const session = await auth()

  if (session?.user.role !== 'Admin')
    throw new Error('Admin permission required')
  return <ProductList />
}
