import React from 'react'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import ClientEditForm from '../client-edit-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params

  const client = await getClientById(id)

  return (
    <div className='max-w-3xl mx-auto p-6 space-y-6 pt-0'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline'>
          <Link href='/clients'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează clientul {client.name}</h1>
      </div>
      <ClientEditForm initialValues={client} />
    </div>
  )
}
