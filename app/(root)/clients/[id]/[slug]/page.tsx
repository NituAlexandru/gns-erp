import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { chunkString, toSlug } from '@/lib/utils'
import SeparatorWithOr from '@/components/shared/separator-or'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import { Barcode } from '@/components/barcode/barcode-image'
import { auth } from '@/auth'

export default async function ClientViewPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'Admin'

  const { id, slug } = await params
  const client = await getClientById(id)
  if (!client) {
    return notFound()
  }

  // redirect to canonical slug
  const canonical = toSlug(client.name)
  if (slug !== canonical) {
    return redirect(`/clients/${id}/${canonical}`)
  }

  return (
    <div>
      <div className='flex items-center justify-between gap-4 px-6'>
        <div className='flex items-center gap-4 mb-5'>
          <Button asChild variant='outline'>
            <Link href='/clients'>
              <ChevronLeft /> Înapoi
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>Detalii client {client.name}</h1>
        </div>
        <div className='my-2'>
          <Barcode
            text={client.vatId || client.cnp || ''}
            type='code128'
            width={300}
            height={100}
          />
        </div>
      </div>

      <div className='px-6 space-y-6'>
        {/* Cele trei coloane principale */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-0'>
          {/* Informații Generale */}
          <div className='space-y-2'>
            <p>
              <strong>ID:</strong> {client._id}
            </p>
            <p>
              <strong>Nume:</strong> {client.name}
            </p>
            <p>
              <strong>Email:</strong> {client.email || '—'}
            </p>
            <p>
              <strong>Telefon:</strong> {client.phone || '—'}
            </p>{' '}
            {client.bankAccountLei && (
              <p>
                IBAN Lei:{' '}
                <strong> {chunkString(client.bankAccountLei, 4)}</strong>
              </p>
            )}
            {client.bankAccountEuro && (
              <p>
                IBAN Euro:{' '}
                <strong>{chunkString(client.bankAccountEuro, 4)}</strong>
              </p>
            )}
          </div>

          {/* Informații Fiscale și Bancare */}
          <div className='space-y-2'>
            {client.isVatPayer && (
              <p className='font-semibold text-green-600'>✔ Plătitor de TVA</p>
            )}
            <p>
              <strong>Tip client:</strong> {client.clientType}
            </p>
            {client.clientType === 'Persoana fizica' && client.cnp && (
              <p>
                <strong>CNP:</strong> {client.cnp}
              </p>
            )}{' '}
            {client.clientType === 'Persoana juridica' &&
              client.nrRegComert && (
                <p>
                  <strong>Reg. Comerț:</strong> {client.nrRegComert}
                </p>
              )}{' '}
            {client.clientType === 'Persoana juridica' && client.vatId && (
              <p>
                <strong>CUI:</strong> {client.vatId}
              </p>
            )}
            <div>
              <strong>Adresă fiscală:</strong>
              <p className='italic'>{client.address}</p>
            </div>
          </div>

          {/* Adrese și Markup-uri */}
          <div className='space-y-4'>
            {client.deliveryAddresses.length > 0 && (
              <div>
                <strong>Adrese de livrare marfă:</strong>
                <ul className='pl-4'>
                  {client.deliveryAddresses.map((addr, i) => (
                    <li key={i} className='italic'>
                      {addr}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isAdmin && client.defaultMarkups && (
              <div>
                <strong>Markup-uri implicite:</strong>
                <ul className='grid grid-cols-1 md:grid-cols-2 gap-x-6 pl-4'>
                  {client.defaultMarkups.directDeliveryPrice != null && (
                    <li>
                      Livrare directă:{' '}
                      {client.defaultMarkups.directDeliveryPrice} %
                    </li>
                  )}
                  {client.defaultMarkups.fullTruckPrice != null && (
                    <li>
                      Macara/Tir full: {client.defaultMarkups.fullTruckPrice} %
                    </li>
                  )}
                  {client.defaultMarkups.smallDeliveryBusinessPrice != null && (
                    <li>
                      Livrare mică (PJ):{' '}
                      {client.defaultMarkups.smallDeliveryBusinessPrice} %
                    </li>
                  )}
                  {client.defaultMarkups.retailPrice != null && (
                    <li>
                      Preț retail (PF): {client.defaultMarkups.retailPrice} %
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Mențiuni */}
        {client.mentions && (
          <div className='flex flex-row gap-2 mb-0 mt-2'>
            <strong>Mențiuni:</strong>
            <p className='w-full italic text-muted-foreground font-light text-justify mb-0'>
              {' '}
              {client.mentions}
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className='mb-0 text-sm text-muted-foreground space-y-1 flex flex-row gap-20 justify-end'>
          <p>
            <strong>Creat la:</strong>{' '}
            {new Date(client.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Actualizat la:</strong>{' '}
            {new Date(client.updatedAt).toLocaleString()}
          </p>
        </div>

        <SeparatorWithOr> </SeparatorWithOr>
      </div>
    </div>
  )
}
