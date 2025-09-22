import React from 'react'

import { chunkString } from '@/lib/utils'
import SeparatorWithOr from '@/components/shared/separator-or'
import { Barcode } from '@/components/barcode/barcode-image'

import { IClientDoc } from '@/lib/db/modules/client/types'

const formatMinutes = (minutes: number | undefined) => {
  if (!minutes || minutes < 0) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

interface ClientDetailsProps {
  client: IClientDoc
  isAdmin: boolean
}

export function ClientDetails({ client, isAdmin }: ClientDetailsProps) {
  return (
    <div>
      <div className='flex items-center justify-between gap-4 px-6'>
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
            </p>

            {/* 🔽 MODIFICAT: Afișare cont bancar structurat */}
            {client.bankAccountLei?.iban && (
              <div className='pt-2'>
                <p className='text-sm font-semibold'>Cont Bancar LEI</p>
                <p>
                  <strong>IBAN:</strong>{' '}
                  {chunkString(client.bankAccountLei.iban, 4)}
                </p>
                <p>
                  <strong>Bancă:</strong> {client.bankAccountLei.bankName}
                </p>
              </div>
            )}
            {client.bankAccountEuro?.iban && (
              <div className='pt-2'>
                <p className='text-sm font-semibold'>Cont Bancar EURO</p>
                <p>
                  <strong>IBAN:</strong>{' '}
                  {chunkString(client.bankAccountEuro.iban, 4)}
                </p>
                <p>
                  <strong>Bancă:</strong> {client.bankAccountEuro.bankName}
                </p>
              </div>
            )}
          </div>

          {/* Informații Fiscale */}
          <div className='space-y-2'>
            {client.isVatPayer && (
              <p className='font-semibold text-green-600'>✔ Plătitor de TVA</p>
            )}
            <p>
              <strong>Tip client:</strong> {client.clientType}
            </p>
            {client.paymentTerm > 0 && (
              <p>
                <strong>Termen de plată:</strong> {client.paymentTerm} zile
              </p>
            )}
            {client.cnp && (
              <p>
                <strong>CNP:</strong> {client.cnp}
              </p>
            )}
            {client.nrRegComert && (
              <p>
                <strong>Reg. Comerț:</strong> {client.nrRegComert}
              </p>
            )}
            {client.vatId && (
              <p>
                <strong>CUI:</strong> {client.vatId}
              </p>
            )}

            {/* 🔽 MODIFICAT: Afișare adresă fiscală structurată */}
            <div>
              <strong>Adresă fiscală:</strong>
              <div className='italic pl-2'>
                <p>{`${client.address.strada}, Nr. ${client.address.numar}`}</p>
                <p>{`${client.address.localitate}, ${client.address.judet}, ${client.address.codPostal}`}</p>
                {client.address.alteDetalii && (
                  <p className='text-xs'>{client.address.alteDetalii}</p>
                )}
              </div>
            </div>
            {(client.contractNumber || client.contractDate) && (
              <div className='pt-2'>
                <p className='text-sm font-semibold'>Detalii Contract</p>
                {client.contractNumber && (
                  <p>
                    <strong>Număr:</strong> {client.contractNumber}
                  </p>
                )}
                {client.contractDate && (
                  <p>
                    <strong>Data:</strong>{' '}
                    {new Date(client.contractDate).toLocaleDateString('ro-RO')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Adrese de livrare și Markup-uri */}
          <div className='space-y-4'>
            {/* 🔽 MODIFICAT: Afișare adrese de livrare structurate */}
            {client.deliveryAddresses &&
              client.deliveryAddresses.length > 0 && (
                <div>
                  <strong>Adrese de livrare marfă:</strong>
                  <ul className='space-y-3 mt-1'>
                    {client.deliveryAddresses.map((addr, i) => (
                      <li key={i} className='italic border-l-2 pl-2'>
                        <p>{`${addr.strada}, Nr. ${addr.numar}`}</p>
                        <p>{`${addr.localitate}, ${addr.judet}, ${addr.codPostal}`}</p>
                        {addr.alteDetalii && (
                          <p className='text-xs'>{addr.alteDetalii}</p>
                        )}
                        <p className='text-xs not-italic text-muted-foreground mt-1'>
                          {`Distanță: ~${addr.distanceInKm} km | Timp: ~${formatMinutes(addr.travelTimeInMinutes)}`}
                        </p>
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
        <div className='mb-0 text-sm text-muted-foreground space-y-1 flex flex-wrap gap-x-12 gap-y-2 justify-end'>
          <div>
            <p>
              <strong>Creat la:</strong>{' '}
              {new Date(client.createdAt).toLocaleString('ro-RO')}
            </p>{' '}
            {client.createdBy && (
              <p>
                <strong>Creat de:</strong> {client.createdBy.name}
              </p>
            )}
          </div>
          <div>
            <p>
              <strong>Actualizat la:</strong>{' '}
              {new Date(client.updatedAt).toLocaleString('ro-RO')}
            </p>{' '}
            {client.updatedBy && (
              <p>
                <strong>Actualizat de:</strong> {client.updatedBy.name}
              </p>
            )}
          </div>
        </div>

        <SeparatorWithOr />
      </div>
    </div>
  )
}
