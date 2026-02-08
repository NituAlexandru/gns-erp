import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MapPin,
  User,
  CreditCard,
  Truck,
  Calendar,
  Building,
  Info,
} from 'lucide-react'
import type { PopulatedReception } from '@/lib/db/modules/reception/types'

// --- HELPER FORMAT MONETAR ---
const formatMoney = (amount: number | undefined | null, currency = 'RON') => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ReceptionPreviewCard({
  reception,
}: {
  reception: PopulatedReception
}) {
  const deliveries = reception.deliveries || []
  const invoices = reception.invoices || []
  const products = reception.products || []
  const packages = reception.packagingItems || []
  const totalTransportCost = deliveries.reduce(
    (acc, d) => acc + (d.transportCost || 0),
    0,
  )
  const totalTransportVat = deliveries.reduce(
    (acc, d) =>
      acc + (d.transportCost || 0) * ((d.transportVatRate || 0) / 100),
    0,
  )

  const calculateItemTotal = (item: any) => {
    const quantity = item.quantity || 0
    const price = item.invoicePricePerUnit || 0
    const vatRate = item.vatRate || 0

    const net = quantity * price
    const vat = net * (vatRate / 100)
    return { net, vat }
  }

  let totalNetProducts = 0
  let totalVatProducts = 0

  // Calculăm totalurile iterând prin liste ca să fim siguri
  products.forEach((p) => {
    const { net, vat } = calculateItemTotal(p)
    totalNetProducts += net
    totalVatProducts += vat
  })
  packages.forEach((p) => {
    const { net, vat } = calculateItemTotal(p)
    totalNetProducts += net
    totalVatProducts += vat
  })

  const grandTotalNet = totalNetProducts + totalTransportCost
  const grandTotalVat = totalVatProducts + totalTransportVat
  const grandTotal = grandTotalNet + grandTotalVat

  // Date Furnizor
  const supplierSnapshot = reception.supplierSnapshot
  const supplierPopulated = reception.supplier as any
  const supplierName =
    supplierSnapshot?.name || supplierPopulated?.name || 'Furnizor Necunoscut'
  const supplierCui =
    supplierSnapshot?.cui ||
    supplierPopulated?.cui ||
    supplierPopulated?.fiscalCode ||
    '-'

  return (
    <div className='w-[950px] bg-card text-card-foreground shadow-sm border rounded-lg overflow-hidden flex flex-col text-xs'>
      {/* --- 1. HEADER (Info Generale) --- */}
      <div className='bg-muted/40 p-4 border-b flex justify-between items-start'>
        <div className='space-y-1'>
          <div className='flex items-center gap-3'>
            <h3 className='text-lg font-black uppercase tracking-tight'>
              {supplierName}
            </h3>
            <Badge
              variant={
                reception.status === 'CONFIRMAT' ? 'default' : 'secondary'
              }
              className='px-2'
            >
              {reception.status}
            </Badge>
          </div>
          <div className='flex items-center gap-4 text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Building className='h-3 w-3' /> CUI: {supplierCui}
            </span>
            <span className='flex items-center gap-1'>
              <MapPin className='h-3 w-3' />
              {reception.destinationType === 'PROIECT'
                ? 'Proiect'
                : 'Depozit'}: {reception.destinationLocation}
            </span>
          </div>
        </div>

        <div className='text-right space-y-1'>
          <div className='flex items-center justify-end gap-1 text-muted-foreground'>
            <Calendar className='h-3 w-3' />
            {format(new Date(reception.receptionDate), 'dd MMM yyyy', {
              locale: ro,
            })}
          </div>
          <div className='flex items-center justify-end gap-1 text-muted-foreground'>
            <User className='h-3 w-3' />
            {reception.createdByName}
          </div>
        </div>
      </div>

      {/* --- 2. GRID LOGISTICĂ & FINANCIAR --- */}
      <div className='grid grid-cols-2 gap-0 divide-x border-b bg-card'>
        {/* LOGISTICĂ */}
        <div className='p-4 space-y-3'>
          <div className='flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider mb-2'>
            <Truck className='h-3.5 w-3.5' /> Logistică
          </div>

          {deliveries.length > 0 ? (
            <div className='space-y-3'>
              {deliveries.map((del, i) => (
                <div
                  key={i}
                  className='flex flex-col border-b border-dashed pb-2 last:border-0 last:pb-0'
                >
                  {/* Rândul 1: Număr Aviz și Dată */}
                  <div className='flex justify-between items-start'>
                    <div className='font-bold text-sm'>
                      Aviz: {del.dispatchNoteNumber}
                    </div>
                    <div className='font-mono text-xs'>
                      {format(new Date(del.dispatchNoteDate), 'dd.MM.yyyy')}
                    </div>
                  </div>

                  {/* Rândul 2: Auto și Cost */}
                  <div className='flex justify-between items-center text-xs mt-1'>
                    <div className='text-muted-foreground'>
                      Auto: {del.carNumber || '-'}
                    </div>
                    <div className='text-muted-foreground'>
                      Transp: {formatMoney(del.transportCost)}
                    </div>
                  </div>

                  {del.notes && (
                    <div className='mt-2 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-md text-[10px] text-amber-800 dark:text-amber-200 flex items-start gap-2'>
                      <Info className='h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400' />
                      <span className='italic leading-tight'>{del.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className='text-muted-foreground italic'>
              Fără transport.
            </span>
          )}
        </div>

        {/* FINANCIAR */}
        <div className='p-4 space-y-3'>
          <div className='flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider mb-2'>
            <CreditCard className='h-3.5 w-3.5' /> Financiar
          </div>

          {invoices.length > 0 ? (
            <div className='space-y-3'>
              {invoices.map((inv, i) => (
                <div
                  key={i}
                  className='flex justify-between items-start border-b border-dashed pb-2 last:border-0 last:pb-0'
                >
                  <div>
                    <div className='font-bold text-sm'>Fact: {inv.number}</div>
                    <div className='text-muted-foreground'>
                      Scad:{' '}
                      {inv.dueDate
                        ? format(new Date(inv.dueDate), 'dd.MM.yyyy')
                        : '-'}
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-bold text-green-600 text-sm'>
                      {formatMoney(inv.totalWithVat, inv.currency)}
                    </div>
                    <div className='text-muted-foreground'>
                      Net: {formatMoney(inv.amount, inv.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className='text-muted-foreground italic'>Fără facturi.</span>
          )}
        </div>
      </div>

      {(() => {
        const gridClass =
          'grid grid-cols-[30px_1fr_80px_50px_100px_110px] gap-2 items-center px-4'

        return (
          <div className='flex-1 min-h-0 bg-muted/10 flex flex-col border-t border-b text-xs'>
            {/* --- TABLE HEADER --- */}
            <div
              className={`${gridClass} bg-muted/50 border-b border-border h-9 uppercase font-bold text-muted-foreground tracking-wider text-[10px]`}
            >
              <div>#</div>
              <div>Articol</div>
              <div className='text-center'>Cant.</div>
              <div className='text-center'>U.M.</div>
              <div className='text-right'>Preț</div>
              <div className='text-right'>Total Net</div>
            </div>

            {/* --- TABLE BODY (SCROLLABLE) --- */}
            <ScrollArea className='h-[250px] w-full bg-card'>
              <div className='flex flex-col'>
                {/* LISTA PRODUSE */}
                {products.map((p, i) => (
                  <div
                    key={`p-${i}`}
                    className={`${gridClass} py-2 border-b border-muted/50 hover:bg-muted/30 transition-colors`}
                  >
                    <div className='text-muted-foreground'>{i + 1}</div>
                    <div className='font-medium min-w-0'>
                      <div className='truncate' title={p.productName}>
                        {p.productName}
                      </div>
                      {p.productCode && (
                        <div className='text-[10px] text-muted-foreground truncate'>
                          Cod: {p.productCode}
                        </div>
                      )}
                    </div>

                    {/* 3. Cantitate */}
                    <div className='text-center font-bold bg-muted/20 rounded py-0.5'>
                      {p.quantity}
                    </div>

                    {/* 4. U.M. */}
                    <div className='text-center text-[10px] text-muted-foreground'>
                      {p.unitMeasure}
                    </div>

                    {/* 5. Preț */}
                    <div className='text-right font-mono text-muted-foreground'>
                      {formatMoney(p.invoicePricePerUnit)}
                    </div>

                    {/* 6. Total Net */}
                    <div className='text-right font-mono font-medium text-foreground'>
                      {formatMoney(
                        (p.quantity || 0) * (p.invoicePricePerUnit || 0),
                      )}
                    </div>
                  </div>
                ))}

                {/* LISTA AMBALAJE (Dacă există) */}
                {packages.length > 0 && (
                  <>
                    {/* Header Separator Ambalaje */}
                    <div className='bg-amber-50/50 dark:bg-amber-950/20 py-1.5 px-4 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-1'>
                      Ambalaje / Paletizare
                    </div>

                    {packages.map((pkg, i) => (
                      <div
                        key={`pkg-${i}`}
                        className={`${gridClass} py-2 border-b border-muted/50 hover:bg-muted/30 transition-colors`}
                      >
                        {/* 1. Index (Continuare) */}
                        <div className='text-muted-foreground'>
                          {products.length + i + 1}
                        </div>

                        {/* 2. Nume Ambalaj */}
                        <div className='text-muted-foreground min-w-0'>
                          <div className='truncate' title={pkg.packagingName}>
                            {pkg.packagingName}
                          </div>
                        </div>

                        {/* 3. Cantitate */}
                        <div className='text-center font-bold bg-muted/20 rounded py-0.5'>
                          {pkg.quantity}
                        </div>

                        {/* 4. U.M. */}
                        <div className='text-center text-[10px] text-muted-foreground'>
                          {pkg.unitMeasure}
                        </div>

                        {/* 5. Preț */}
                        <div className='text-right font-mono text-muted-foreground'>
                          {formatMoney(pkg.invoicePricePerUnit)}
                        </div>

                        {/* 6. Total Net */}
                        <div className='text-right font-mono font-medium text-foreground'>
                          {formatMoney(
                            (pkg.quantity || 0) *
                              (pkg.invoicePricePerUnit || 0),
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )
      })()}

      {/* --- 4. FOOTER (Totaluri) --- */}
      <div className='bg-slate-950 text-slate-50 p-3 flex items-center justify-between border-t border-slate-800'>
        <div className='flex gap-4 text-xs text-slate-400'>
          <div>
            Net:{' '}
            <span className='text-slate-200 font-mono'>
              {formatMoney(grandTotalNet)}
            </span>
          </div>
          <div className='border-l border-slate-700 pl-4'>
            TVA:{' '}
            <span className='text-slate-200 font-mono'>
              {formatMoney(grandTotalVat)}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-bold uppercase tracking-wider text-xs'>
            Total:
          </span>
          <span className='font-bold text-lg font-mono tracking-tight'>
            {formatMoney(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
