import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { getSupplierById } from '@/lib/db/modules/suppliers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/auth'
import { chunkString, toSlug } from '@/lib/utils'
import SeparatorWithOr from '@/components/shared/separator-or'

// Componenta primește `params` ca o promisiune
export default async function SupplierView({
  params,
}: {
  // ✨ Tipul este acum Promise<{...}> ✨
  params: Promise<{ id: string; slug: string }>
}) {
  await auth()

  // ✨ AICI ESTE SOLUȚIA: `await params` ✨
  const { id, slug } = await params

  const supplier = await getSupplierById(id)

  if (!supplier) {
    notFound()
  }

  const canonical = toSlug(supplier.name)
  if (slug !== canonical) {
    return redirect(`/admin/suppliers/${id}/${canonical}`)
  }

  return (
    <div>
      <div className='flex items-center gap-4 mb-5'>
        {' '}
        <Button asChild variant='outline'>
          <Link href='/admin/suppliers'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>{' '}
        <h1 className='text-2xl font-bold'>Detalii furnizor {supplier.name}</h1>
      </div>
      <div className='p-6'>
        <div className=' flex gap-3'>
          {/* Informații Generale */}
          <div className='w-1/5'>
            <p>
              <strong>ID:</strong> {supplier._id}
            </p>
            <p>
              <strong>Nume Furnizor:</strong> {supplier.name}
            </p>
            {supplier.contactName && (
              <p>
                <strong>Persoană Contact:</strong> {supplier.contactName}
              </p>
            )}
            <p>
              <strong>Email:</strong> {supplier.email}
            </p>
            <p>
              <strong>Telefon:</strong> {supplier.phone}
            </p>
          </div>
          {/* Informații Bancare */}
          <div className='w-1/5'>
            {' '}
            {supplier.externalTransport && (
              <p className='font-semibold text-green-500'>
                ✔ Transport asigurat de furnizor
              </p>
            )}
            {/* Informații Transport */}
            <p>
              <strong>Costuri transport intern:</strong>{' '}
              {supplier.internalTransportCosts} LEI
            </p>
            <p>
              <strong>Costuri transport extern:</strong>{' '}
              {supplier.externalTransportCosts} LEI
            </p>{' '}
            {supplier.bankAccountLei && (
              <p>
                <strong>Cont LEI:</strong>{' '}
                {chunkString(supplier.bankAccountLei, 4)}
              </p>
            )}
            {supplier.bankAccountEuro && (
              <p>
                <strong>Cont EURO:</strong>{' '}
                {chunkString(supplier.bankAccountEuro, 4)}
              </p>
            )}
          </div>

          {/* Informații Fiscale și de Adresă */}
          <div className='w-1/5'>
            {' '}
            {supplier.isVatPayer && (
              <p className='font-semibold text-green-600'>✔ Plătitor de TVA</p>
            )}
            <p>
              <strong>Adresă fiscală:</strong> {supplier.address}
            </p>
            <p>
              <strong>Cod Fiscal:</strong> {supplier.fiscalCode}
            </p>
            <p>
              <strong>Nr. Registru Comerț:</strong> {supplier.regComNumber}
            </p>
            {/* Afișăm adresele de încărcare dacă există */}
            {supplier.loadingAddress && supplier.loadingAddress.length > 0 && (
              <>
                <strong>Adrese de încărcare:</strong>
                <ul className='list-disc list-inside pl-4'>
                  {supplier.loadingAddress.map((addr, index) => (
                    <li key={index}>{addr}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {/* Branduri și Mențiuni */}
          <div className='w-1/3'>
            {supplier.brand && supplier.brand.length > 0 && (
              <p>
                <strong>Branduri:</strong> {supplier.brand.join(', ')}
              </p>
            )}
            {supplier.mentions && (
              <p>
                <strong>Mențiuni:</strong>{' '}
                <span className='w-full italic text-muted-foreground font-light text-justify'>
                  {supplier.mentions}
                </span>{' '}
              </p>
            )}
          </div>
        </div>
        <SeparatorWithOr> </SeparatorWithOr>
      </div>
    </div>
  )
}
