'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { formatCurrency, round2 } from '@/lib/utils'
import { SupplierOrderCreateInput } from '@/lib/db/modules/supplier-orders/supplier-order.validator'

export function SupplierOrderTotals() {
  const { control } = useFormContext<SupplierOrderCreateInput>()

  // Ascultăm tot ce influențează prețul
  const products = useWatch({ control, name: 'products' })
  const packaging = useWatch({ control, name: 'packagingItems' })
  const transportTotalNet =
    useWatch({ control, name: 'transportDetails.totalTransportCost' }) || 0
  const transportVatRate =
    useWatch({ control, name: 'transportDetails.transportVatRate' }) || 0

  // 1. Calcul Produse
  const productsCalc = (products || []).reduce(
    (acc, item) => {
      const net = (item.quantityOrdered || 0) * (item.pricePerUnit || 0)
      const vat = net * ((item.vatRate || 0) / 100)
      return {
        net: acc.net + net,
        vat: acc.vat + vat,
      }
    },
    { net: 0, vat: 0 }
  )

  // 2. Calcul Ambalaje
  const packagingCalc = (packaging || []).reduce(
    (acc, item) => {
      const net = (item.quantityOrdered || 0) * (item.pricePerUnit || 0)
      const vat = net * ((item.vatRate || 0) / 100)
      return {
        net: acc.net + net,
        vat: acc.vat + vat,
      }
    },
    { net: 0, vat: 0 }
  )

  // 3. Calcul Transport
  const transportCalc = {
    net: transportTotalNet,
    vat: transportTotalNet * (transportVatRate / 100),
  }

  // 4. Agregare
  const totals = {
    totalNet: round2(productsCalc.net + packagingCalc.net + transportCalc.net),
    totalVat: round2(productsCalc.vat + packagingCalc.vat + transportCalc.vat),
  }
  const grandTotal = round2(totals.totalNet + totals.totalVat)

  return (
    <div className='flex flex-col  border rounded-lg bg-card shadow-sm'>
      <div className='p-4 border-b bg-muted/20'>
        <h2 className='text-lg font-semibold'>Sumar Detaliat</h2>
      </div>

      <div className='p-4 flex flex-col space-y-4'>
        {/* Detalii */}
        <div className='space-y-3 text-sm'>
          {/* Produse */}
          <div className='space-y-1 pb-2 border-b border-dashed'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>
                Total Produse (Net):
              </span>
              <span>{formatCurrency(productsCalc.net)}</span>
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>TVA Produse:</span>
              <span>{formatCurrency(productsCalc.vat)}</span>
            </div>
          </div>

          {/* Ambalaje */}
          <div className='space-y-1 pb-2 border-b border-dashed'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>
                Total Ambalaje (Net):
              </span>
              <span>{formatCurrency(packagingCalc.net)}</span>
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>TVA Ambalaje:</span>
              <span>{formatCurrency(packagingCalc.vat)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className='space-y-1 pb-2 border-b border-dashed'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>
                Total Transport (Net):
              </span>
              <span>{formatCurrency(transportCalc.net)}</span>
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>TVA Transport ({transportVatRate}%):</span>
              <span>{formatCurrency(transportCalc.vat)}</span>
            </div>
          </div>
        </div>

        {/* Totale Finale */}
        <div className='bg-muted/30 p-0 rounded-lg space-y-2 '>
          <div className='flex justify-between text-sm'>
            <span className='font-semibold text-muted-foreground'>
              Valoare Netă Totală:
            </span>
            <span className='font-bold'>{formatCurrency(totals.totalNet)}</span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='font-semibold text-muted-foreground'>
              TVA Total:
            </span>
            <span className='font-bold'>{formatCurrency(totals.totalVat)}</span>
          </div>
          <div className='border-t border-primary/20 pt-2 mt-2 flex justify-between items-center'>
            <span className='text-lg font-bold text-foreground'>TOTAL:</span>
            <span className='text-xl font-bold text-primary'>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
