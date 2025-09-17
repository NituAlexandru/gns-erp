import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/auth'
import { chunkString, toSlug } from '@/lib/utils'
import SeparatorWithOr from '@/components/shared/separator-or'
import { Barcode } from '@/components/barcode/barcode-image'
import { getSupplierById } from '@/lib/db/modules/suppliers/supplier.actions'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'

export default async function SupplierView({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  await auth()

  const { id, slug } = await params
  const supplier = await getSupplierById(id)

  if (!supplier) {
    notFound()
  }

  const canonical = toSlug(supplier.name)
  if (slug !== canonical) {
    return redirect(`/admin/management/suppliers/${id}/${canonical}`)
  }

  return (
    <div>
      <div className='flex items-center justify-between gap-4 mr-20 px-6'>
        <div className='flex items-center gap-4 mb-5'>
          <Button asChild variant='outline'>
            <Link href='/admin/management/suppliers'>
              <ChevronLeft /> Înapoi
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>
            Detalii furnizor {supplier.name}
          </h1>
        </div>
        <div className='my-2'>
          <Barcode
            text={supplier.fiscalCode || ''}
            type='code128'
            width={300}
            height={100}
          />
        </div>
      </div>
      <div className='p-6 pt-0'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-4'>
          {/* Informații Generale */}
          <div className='space-y-2'>
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
            {supplier.brand && supplier.brand.length > 0 && (
              <p>
                <strong>Branduri:</strong> {supplier.brand.join(', ')}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            {supplier.isVatPayer && (
              <p className='font-semibold text-green-600'>✔ Plătitor de TVA</p>
            )}
            <p>
              <strong>Cod Fiscal:</strong> {supplier.fiscalCode}
            </p>
            <p>
              <strong>Nr. Reg. Comerț:</strong> {supplier.regComNumber}
            </p>

            {(supplier.contractNumber || supplier.contractDate) && (
              <div className='pt-2'>
                <p className='text-sm font-semibold'>Detalii Contract</p>
                {supplier.contractNumber && (
                  <p>
                    <strong>Număr:</strong> {supplier.contractNumber}
                  </p>
                )}
                {supplier.contractDate && (
                  <p>
                    <strong>Data:</strong>{' '}
                    {new Date(supplier.contractDate).toLocaleDateString(
                      'ro-RO'
                    )}
                  </p>
                )}
              </div>
            )}
            {supplier.paymentTerm > 0 && (
              <p>
                <strong>Termen de plată:</strong> {supplier.paymentTerm} zile
              </p>
            )}
          </div>

          <div className='space-y-4'>
            {supplier.bankAccountLei?.iban && (
              <div>
                <p className='text-sm font-semibold'>Cont Bancar LEI</p>
                <p>
                  <strong>IBAN:</strong>{' '}
                  {chunkString(supplier.bankAccountLei.iban, 4)}
                </p>
                <p>
                  <strong>Bancă:</strong> {supplier.bankAccountLei.bankName}
                </p>
              </div>
            )}
            {supplier.bankAccountEuro?.iban && (
              <div className='mt-2'>
                <p className='text-sm font-semibold'>Cont Bancar EURO</p>
                <p>
                  <strong>IBAN:</strong>{' '}
                  {chunkString(supplier.bankAccountEuro.iban, 4)}
                </p>
                <p>
                  <strong>Bancă:</strong> {supplier.bankAccountEuro.bankName}
                </p>
              </div>
            )}

            <div className='pt-2'>
              <strong>Adresă fiscală:</strong>
              <div className='italic pl-2'>
                <p>{`${supplier.address.strada}, Nr. ${supplier.address.numar}`}</p>
                <p>{`${supplier.address.localitate}, ${supplier.address.judet}, ${supplier.address.codPostal}`}</p>
                {supplier.address.alteDetalii && (
                  <p className='text-xs'>{supplier.address.alteDetalii}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {supplier.loadingAddresses && supplier.loadingAddresses.length > 0 && (
          <div className='pt-4'>
            <h3 className='text-lg font-semibold mb-2'>
              Adrese de încărcare marfă
            </h3>
            <ul className='space-y-3 mt-1'>
              {supplier.loadingAddresses.map((addr, i) => (
                <li key={i} className='italic border-l-2 pl-2'>
                  <p>{`${addr.strada}, Nr. ${addr.numar}`}</p>
                  <p>{`${addr.localitate}, ${addr.judet}, ${addr.codPostal}`}</p>
                  {addr.alteDetalii && (
                    <p className='text-xs'>{addr.alteDetalii}</p>
                  )}
                  <p className='text-xs not-italic text-muted-foreground mt-1'>
                    {`Distanta dus-întors: ~${addr.distanceInKm} km | Timp dus-întors: ~${formatMinutes(addr.travelTimeInMinutes)}`}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {supplier.mentions && (
          <div className='pt-4'>
            <h3 className='text-lg font-semibold'>Mențiuni</h3>
            <p className='italic text-muted-foreground'>{supplier.mentions}</p>
          </div>
        )}

        {/* 🔽 MODIFICAT: Afișare Timestamps și Audit */}
        <div className='mb-0 text-sm text-muted-foreground flex flex-wrap gap-x-12 gap-y-2 justify-end'>
          <div>
            <p>
              <strong>Creat la:</strong>{' '}
              {new Date(supplier.createdAt).toLocaleString('ro-RO')}
            </p>
            {supplier.createdBy && (
              <p>
                <strong>Creat de:</strong> {supplier.createdBy.name}
              </p>
            )}
          </div>
          <div>
            <p>
              <strong>Actualizat la:</strong>{' '}
              {new Date(supplier.updatedAt).toLocaleString('ro-RO')}
            </p>{' '}
            {supplier.updatedBy && (
              <p>
                <strong>Actualizat de:</strong> {supplier.updatedBy.name}
              </p>
            )}
          </div>
        </div>
      </div>{' '}
      <SeparatorWithOr />
    </div>
  )
}
