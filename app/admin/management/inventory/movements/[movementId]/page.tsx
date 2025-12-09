import { getStockMovementDetails } from '@/lib/db/modules/inventory/inventory.actions'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  MOVEMENT_TYPE_DETAILS_MAP,
  LOCATION_NAMES_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import { formatCurrency, cn } from '@/lib/utils'
import { BackButton } from './back-button'
import { UnitDisplay } from '@/components/inventory/unit-display'
import { PriceDisplay } from '@/components/inventory/price-display'

// --- HELPERE PENTRU MAPAREA DATELOR DIN LOG-URILE TALE ---

// 1. Extrage Numărul Documentului (din seriesName + noteNumber sau invoiceNumber)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDocumentNumber = (movement: any, reference: any) => {
  if (movement.documentNumber) return movement.documentNumber
  if (!reference) return '-'

  // Logica pentru Avize (GNS-A 00087) și Facturi
  const series = reference.seriesName || reference.series || ''
  const number =
    reference.noteNumber || reference.invoiceNumber || reference.number || ''

  if (series || number) return `${series} ${number}`.trim()
  return reference.orderNumberSnapshot || '-'
}

// 2. Extrage Detaliile Produsului din Snapshot (Mapat pe log-ul tău: productName, unitOfMeasure)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSnapshotItemDetails = (item: any) => {
  // LOG CONFIRMAT: productName este la rădăcină
  const name = item.productName || item.product?.name || 'Produs necunoscut'

  // LOG CONFIRMAT: unitOfMeasure este la rădăcină
  const unit =
    item.unitOfMeasure || item.unitMeasure || item.product?.unitMeasure || 'buc'

  // LOG CONFIRMAT: priceAtTimeOfOrder pentru avize, unitPrice pentru facturi
  const price = item.priceAtTimeOfOrder ?? item.unitPrice ?? item.price ?? 0

  // LOG CONFIRMAT: packagingOptions există direct pe item
  const options = item.packagingOptions || []

  return { name, unit, price, options }
}

// 3. Extrage Nume Partener (Furnizor sau Client)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPartnerName = (movement: any) => {
  if (IN_TYPES.has(movement.movementType)) {
    return movement.supplier?.name || '-'
  }

  // Pentru ieșiri (Avize), partenerul este clientul
  // Verificăm dacă clientId este populat sau folosim snapshot
  if (movement.clientId?.name) return movement.clientId.name
  if (movement.clientSnapshot?.name) return movement.clientSnapshot.name

  // Fallback la note
  if (movement.note?.includes('de la furnizor')) {
    return movement.note.split('de la furnizor')[1]?.trim() || '-'
  }
  return '-'
}

// 4. Construiește opțiunile pentru produsul principal (header)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildMainItemOptions = (stockItem: any) => {
  if (!stockItem) return []
  const options = []
  if (stockItem.packagingUnit && stockItem.packagingQuantity) {
    options.push({
      unitName: stockItem.packagingUnit,
      baseUnitEquivalent: stockItem.packagingQuantity,
    })
  }
  return options
}

// --- PAGINA PRINCIPALĂ ---

export default async function MovementDetailsPage({
  params,
}: {
  params: Promise<{ movementId: string }>
}) {
  const { movementId } = await params
  const data = await getStockMovementDetails(movementId)

  if (!data || !data.movement) {
    return (
      <div className='p-6'>
        <Card className='border-destructive/50'>
          <CardHeader>
            <CardTitle className='text-destructive'>
              Mișcare inexistentă
            </CardTitle>
          </CardHeader>
          <CardContent>ID: {movementId}</CardContent>
        </Card>
      </div>
    )
  }

  const { movement, reference } = data
  const movementTypeDetails = MOVEMENT_TYPE_DETAILS_MAP[movement.movementType]

  // Locație
  const locationKey = movement.locationTo || movement.locationFrom
  const locationName = locationKey ? LOCATION_NAMES_MAP[locationKey] : '-'

  // Partener
  const partnerLabel = IN_TYPES.has(movement.movementType)
    ? 'Furnizor'
    : 'Client'
  const partnerName = getPartnerName(movement)

  // Document & Produs
  const displayDocNumber = getDocumentNumber(movement, reference)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainItemOptions = buildMainItemOptions(movement.stockableItem as any)

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <BackButton />
        <h1 className='text-2xl font-semibold tracking-tight'>
          Detalii Mișcare Stoc
        </h1>
      </div>

      <div className='flex flex-col lg:flex-row gap-6'>
        {/* Coloana Stânga */}
        <div className='lg:w-2/3 flex flex-col gap-6'>
          {/* Card 1: Informații Generale */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle>Informații Generale</CardTitle>
              <CardDescription className='font-mono text-xs'>
                ID: {movement._id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-1'>
                <DetailRow
                  label='Dată și Oră'
                  value={format(
                    new Date(movement.timestamp),
                    'dd MMMM yyyy, HH:mm',
                    { locale: ro }
                  )}
                />
                <DetailRow
                  label='Tip Mișcare'
                  value={
                    <Badge
                      variant={movementTypeDetails?.variant || 'secondary'}
                    >
                      {movementTypeDetails?.name || movement.movementType}
                    </Badge>
                  }
                />
                <DetailRow
                  label='Document Referință'
                  value={
                    <span className='font-semibold text-primary'>
                      {displayDocNumber}
                    </span>
                  }
                />
                <DetailRow label={partnerLabel} value={partnerName} />
                <DetailRow
                  label='Produs'
                  value={movement.stockableItem?.name || 'N/A'}
                />
                <DetailRow
                  label='Cantitate'
                  value={
                    <div className='flex justify-end gap-1'>
                      <span
                        className={
                          IN_TYPES.has(movement.movementType)
                            ? 'text-green-600 font-bold'
                            : 'text-red-600 font-bold'
                        }
                      >
                        {IN_TYPES.has(movement.movementType) ? '+' : '-'}
                      </span>
                      <UnitDisplay
                        baseQuantity={movement.quantity}
                        baseUnit={movement.unitMeasure || ''}
                        options={mainItemOptions}
                        className={
                          IN_TYPES.has(movement.movementType)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      />
                    </div>
                  }
                />
                <DetailRow label='Locație' value={locationName} />
                <DetailRow
                  label='Operator'
                  value={movement.responsibleUser?.name || '-'}
                />
                <DetailRow label='Notă Internă' value={movement.note || '-'} />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Trasabilitate (Cost Breakdown) */}
          {movement.costBreakdown && movement.costBreakdown.length > 0 && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle>Trasabilitate & Loturi Sursă</CardTitle>
                <CardDescription>
                  Loturile din care s-a consumat cantitatea.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Intrare</TableHead>
                      <TableHead>Furnizor Origine</TableHead>
                      <TableHead>Detalii Calitate</TableHead>
                      <TableHead className='text-right'>Cantitate</TableHead>
                      <TableHead className='text-right'>Cost FIFO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {movement.costBreakdown.map((item: any, index: number) => {
                      const lotQuality =
                        item.qualityDetails ||
                        item.batchSnapshot?.qualityDetails
                      // Încercăm să luăm numele furnizorului. Dacă e undefined în DB, afișăm '-'
                      const lotSupplier =
                        item.supplierName ||
                        item.supplier?.name ||
                        item.batchSnapshot?.supplierName ||
                        '-'

                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {item.entryDate
                              ? format(new Date(item.entryDate), 'dd/MM/yyyy', {
                                  locale: ro,
                                })
                              : '-'}
                          </TableCell>
                          <TableCell>{lotSupplier}</TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {lotQuality ? (
                              <div className='space-y-1'>
                                {lotQuality.lotNumbers?.length > 0 && (
                                  <div>
                                    Lot: {lotQuality.lotNumbers.join(', ')}
                                  </div>
                                )}
                                {lotQuality.certificateNumbers?.length > 0 && (
                                  <div>
                                    Cert:{' '}
                                    {lotQuality.certificateNumbers.join(', ')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            <UnitDisplay
                              baseQuantity={item.quantity}
                              baseUnit={movement.unitMeasure || ''}
                              options={mainItemOptions}
                              className='font-medium'
                            />
                          </TableCell>
                          <TableCell className='text-right'>
                            <PriceDisplay
                              baseCost={item.unitCost}
                              baseUnit={movement.unitMeasure || ''}
                              options={mainItemOptions}
                              className='text-sm'
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Card 3: Calitate */}
          {movement.qualityDetails && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle>Calitate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex gap-2 flex-wrap'>
                  {movement.qualityDetails.lotNumbers?.map((l: string) => (
                    <Badge key={l} variant='outline'>
                      {l}
                    </Badge>
                  ))}
                  {movement.qualityDetails.certificateNumbers?.map(
                    (c: string) => (
                      <Badge
                        key={c}
                        variant='secondary'
                        className='border-blue-200 text-blue-700'
                      >
                        {c}
                      </Badge>
                    )
                  )}
                </div>
                {movement.qualityDetails.additionalNotes && (
                  <p className='mt-2 text-sm text-muted-foreground'>
                    {movement.qualityDetails.additionalNotes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coloana Dreapta (Side Info) */}
        <div className='lg:w-1/3 space-y-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle>Balanță Stoc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex justify-between py-2 border-b'>
                <span className='text-muted-foreground'>Înainte</span>
                <span className='font-mono'>
                  {movement.balanceBefore.toFixed(2)}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b bg-muted/20 px-2 -mx-2'>
                <span className='font-semibold'>Mișcare</span>
                <div className='flex gap-1 font-bold'>
                  <span
                    className={
                      IN_TYPES.has(movement.movementType)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {IN_TYPES.has(movement.movementType) ? '+' : '-'}
                  </span>
                  <UnitDisplay
                    baseQuantity={movement.quantity}
                    baseUnit={movement.unitMeasure || ''}
                    options={mainItemOptions}
                    className={
                      IN_TYPES.has(movement.movementType)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  />
                </div>
              </div>
              <div className='flex justify-between py-2 pt-3'>
                <span className='text-muted-foreground font-semibold'>
                  După
                </span>
                <span className='font-mono font-bold text-lg'>
                  {movement.balanceAfter.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Facturile asociate */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(
            (reference as any)?.invoices ||
            (reference as any)?.relatedInvoices ||
            []
          ).length > 0 && (
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle>Facturi Asociate</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(
                  (reference as any)?.invoices ||
                  (reference as any)?.relatedInvoices
                ).map((inv: any, idx: number) => (
                  <div
                    key={idx}
                    className='bg-muted/30 p-3 rounded-md border text-sm'
                  >
                    <div className='flex justify-between font-semibold'>
                      <span>
                        {inv.series} {inv.number}
                      </span>
                      <span>{formatCurrency(inv.totalWithVat)}</span>
                    </div>
                    <div className='text-xs text-muted-foreground mt-1'>
                      Data:{' '}
                      {inv.date
                        ? format(new Date(inv.date), 'dd/MM/yyyy')
                        : '-'}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className='flex justify-between border-b py-2 last:border-0'>
      <dt className='text-muted-foreground text-sm'>{label}</dt>
      <dd className='font-medium text-right text-sm max-w-[60%] truncate'>
        {value}
      </dd>
    </div>
  )
}
