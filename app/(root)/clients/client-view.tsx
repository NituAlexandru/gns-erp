'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { IClientDoc } from '@/lib/db/modules/client/types'

// Nu este folosita nicaieri momentan.

interface Props {
  initialClient: IClientDoc
}

export default function ClientView({ initialClient }: Props) {
  const c = initialClient
  return (
    <div className='max-w-3xl mx-auto p-6 space-y-4'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline'>
          <Link href='/clients'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>{c.name}</h1>
      </div>

      <p>
        <strong>ID:</strong> {c._id}
      </p>
      <p>
        <strong>Tip:</strong> {c.clientType}
      </p>
      {c.clientType === 'Persoana fizica' && c.cnp && (
        <p>
          <strong>CNP:</strong> {c.cnp}
        </p>
      )}
      {c.clientType === 'Persoana juridica' && (
        <>
          {c.vatId && (
            <p>
              <strong>Cod TVA:</strong> {c.vatId}
            </p>
          )}
          {c.nrRegComert && (
            <p>
              <strong>Reg. Comerț:</strong> {c.nrRegComert}
            </p>
          )}
        </>
      )}
      {c.email && (
        <p>
          <strong>Email:</strong> {c.email}
        </p>
      )}
      {c.phone && (
        <p>
          <strong>Telefon:</strong> {c.phone}
        </p>
      )}

      {/* MODIFICAT: Afișare adresă fiscală structurată */}
      <div>
        <strong>Adresă fiscală:</strong>
        <div className='italic pl-2'>
          <p>{`${c.address.strada}, Nr. ${c.address.numar}`}</p>
          <p>{`${c.address.localitate}, ${c.address.judet}, ${c.address.codPostal}`}</p>
          {c.address.alteDetalii && (
            <p className='text-xs'>{c.address.alteDetalii}</p>
          )}
        </div>
      </div>

      {/* MODIFICAT: Afișare adrese de livrare structurate */}
      {c.deliveryAddresses?.length > 0 && (
        <div>
          <strong>Adrese de încărcare marfă:</strong>
          <ul className='list-disc pl-6 space-y-2'>
            {c.deliveryAddresses.map((a, i) => (
              <li key={i}>
                <p>{`${a.strada}, Nr. ${a.numar}, ${a.localitate}, ${a.judet}`}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant='outline' asChild>
        <Link href={`/clients/${c._id}/edit`}>Editează client</Link>
      </Button>
    </div>
  )
}
// Nu este folosita nicaieri momentan.
