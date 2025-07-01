'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import CategoryForm from '../[id]/category-form' // <-- Folosește formularul simplificat
import { Button } from '@/components/ui/button'

export default function NewCategoryPage() {
  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center gap-4 mb-20'>
        <Button asChild variant='outline'>
          <Link href='/admin/categories'>
            <ChevronLeft className='h-4 w-4' /> Inapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Adaugă Categorie Nouă</h1>
      </div>
      <div className='w-[90%] lg:w-1/2'>
        <CategoryForm />
      </div>
    </div>
  )
}
