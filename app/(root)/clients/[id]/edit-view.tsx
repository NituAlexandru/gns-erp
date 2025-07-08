// app/clients/[id]/edit-view.tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ClientEditForm from '../client-edit-form'
import { IClientDoc } from '@/lib/db/modules/client/types'

interface Props {
  // Așteptăm exact această proprietate:
  initialClient: IClientDoc
}

export default function EditClientView({ initialClient }: Props) {
  return (
    <div className='max-w-3xl mx-auto p-6 space-y-6 pt-0'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline'>
          <Link href='/clients'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează client</h1>
      </div>
      {/* Transmitem datele mai departe sub prop-ul `initialValues` */}
      <ClientEditForm initialValues={initialClient} />
    </div>
  )
}
