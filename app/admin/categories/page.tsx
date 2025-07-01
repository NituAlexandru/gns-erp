import React, { Suspense } from 'react'
import { auth } from '@/auth'
import CategoryList from './category-list'
import LoadingPage from '@/app/loading'

export default async function AdminCategoriesPage() {
  const session = await auth()
  if (session?.user.role !== 'Admin') {
    throw new Error('Permisiune Admin necesară')
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <CategoryList />
    </Suspense>
  )
}
