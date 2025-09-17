'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

import SupplierEditForm from '../supplier-edit-form'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'

interface Props {
  initialValues: ISupplierDoc
}

export default function EditSupplierView({ initialValues }: Props) {
  return (
    <div className='max-w-5xl mx-auto p-6 space-y-6 pt-0'>
      <div className='flex items-center gap-4 mb-5'>
        <Button asChild variant='outline'>
          <Link href='/admin/management/suppliers'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează furnizor</h1>
      </div>
      <SupplierEditForm initialValues={initialValues} />{' '}
    </div>
  )
}
