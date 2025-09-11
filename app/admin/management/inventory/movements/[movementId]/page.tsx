// app/admin/management/inventory/movements/[movementId]/page.tsx

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
  TRANSPORT_TYPE_MAP,
} from '@/lib/db/modules/inventory/constants'
import { formatCurrency } from '@/lib/utils'
import { BackButton } from './back-button'
import { UnitDisplay } from '@/components/inventory/unit-display'
import { PriceDisplay } from '@/components/inventory/price-display'

// Componentă pentru a afișa o linie de detalii
function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className='flex justify-between border-b py-2'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='font-medium text-right'>{value}</dd>
    </div>
  )
}

type ItemForConversion =
  | {
      packagingUnit?: string | null
      packagingQuantity?: number | null
      itemsPerPallet?: number | null
    }
  | null
  | undefined

const buildPackagingOptions = (item: ItemForConversion) => {
  if (!item) return []

  const options = []

  //  Conversia simplă (ex: bucata -> bax)
  if (
    item.packagingUnit &&
    item.packagingQuantity &&
    item.packagingQuantity > 0
  ) {
    options.push({
      unitName: item.packagingUnit,
      baseUnitEquivalent: item.packagingQuantity,
    })
  }

  //  Conversia prin palet
  if (item.itemsPerPallet && item.itemsPerPallet > 0) {
    const palletEquivalent =
      item.packagingQuantity && item.packagingQuantity > 1
        ? item.itemsPerPallet * item.packagingQuantity // Cazul kg -> sac -> palet
        : item.itemsPerPallet // Cazul bucata -> palet

    options.push({
      unitName: 'Palet',
      baseUnitEquivalent: palletEquivalent,
    })
  }

  return options
}

export default async function MovementDetailsPage({
  params,
}: {
  params: Promise<{ movementId: string }>
}) {
  const { movementId } = await params
  const data = await getStockMovementDetails(movementId)

  if (!data || !data.movement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-destructive'>
            Mișcare de stoc negăsită
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Nu am putut găsi detalii pentru mișcarea cu ID-ul specificat.</p>
        </CardContent>
      </Card>
    )
  }

  const { movement, reference } = data
  const movementTypeDetails = MOVEMENT_TYPE_DETAILS_MAP[movement.movementType]
  const location = movement.locationTo || movement.locationFrom
  const locationName = location ? LOCATION_NAMES_MAP[location] : '-'

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <BackButton />
        <h1 className='text-2xl font-semibold'>Detalii Mișcare Stoc</h1>
      </div>

      {/* Container principal pentru primele două coloane */}
      <div className='flex flex-col lg:flex-row gap-2'>
        {/* Coloana Stânga (2/3) */}
        <div className='lg:w-2/3 flex flex-col gap-2'>
          <Card className='py-9'>
            <CardHeader>
              <CardTitle>Detalii Mișcare Stoc</CardTitle>
              <CardDescription>ID Mișcare: {movement._id}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className='space-y-2'>
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
                  label='Produs / Ambalaj'
                  value={movement.stockableItem?.name || 'N/A'}
                />
                <DetailRow
                  label='Cod Produs'
                  value={movement.stockableItem?.productCode || '-'}
                />
                <DetailRow
                  label='Cantitate'
                  value={`${movement.quantity.toFixed(2)} ${movement.unitMeasure}`}
                />
                <DetailRow label='Locație' value={locationName} />
                <DetailRow
                  label='Utilizator Responsabil'
                  value={movement.responsibleUser?.name || '-'}
                />
                <DetailRow label='Notă' value={movement.note || '-'} />
                <DetailRow
                  label='Stoc Înainte'
                  value={movement.balanceBefore.toFixed(2)}
                />
                <DetailRow
                  label='Stoc După'
                  value={movement.balanceAfter.toFixed(2)}
                />
              </dl>
            </CardContent>
          </Card>{' '}
          {/* Cardul cu articolele recepționate singur dedesubt */}
          {reference && (
            <Card>
              <CardHeader>
                <CardTitle>Articole Recepționate</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume Articol</TableHead>
                      <TableHead className='text-right'>Cantitate</TableHead>
                      <TableHead className='text-right'>
                        Cost Final / UM
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reference.products.map((item) => {
                      const packagingOptions = buildPackagingOptions(
                        item.product
                      )
                      return (
                        <TableRow key={item.product?._id}>
                          <TableCell className='font-medium'>
                            {item.product?.name || 'N/A'}
                          </TableCell>
                          <TableCell className='text-right font-bold'>
                            {/* Folosim componenta pentru cantități */}
                            <UnitDisplay
                              baseQuantity={item.quantity}
                              baseUnit={item.unitMeasure}
                              options={packagingOptions}
                            />
                          </TableCell>
                          <TableCell className='text-right'>
                            {/* Folosim noua componentă pentru prețuri */}
                            <PriceDisplay
                              baseCost={item.landedCostPerUnit}
                              baseUnit={item.unitMeasure}
                              options={packagingOptions}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {reference.packagingItems.map((item) => {
                      return (
                        <TableRow key={item.packaging?._id}>
                          <TableCell className='font-medium'>
                            {item.packaging?.name || 'N/A'}
                          </TableCell>
                          <TableCell className='text-right font-bold'>
                            {`${item.quantity.toFixed(2)} ${item.unitMeasure}`}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatCurrency(item.landedCostPerUnit)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coloana Dreapta (1/3) */}
        <div className='lg:w-1/3 space-y-2'>
          {reference && (
            <Card className='py-3'>
              <CardHeader>
                <CardTitle>Document de Referință: Recepție</CardTitle>
                <CardDescription>ID Recepție: {reference._id}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl>
                  <DetailRow
                    label='Creat De'
                    value={reference.createdBy?.name || '-'}
                  />
                  <DetailRow
                    label='Furnizor'
                    value={reference.supplier?.name || '-'}
                  />
                  <DetailRow
                    label='Data Recepție'
                    value={format(
                      new Date(reference.receptionDate),
                      'dd MMMM yyyy',
                      { locale: ro }
                    )}
                  />
                </dl>
              </CardContent>
            </Card>
          )}
          {/* Facturi */}
          {reference &&
            reference.invoices.map((invoice, index) => (
              <Card key={`inv-${index}`} className='py-3'>
                <CardHeader>
                  <CardTitle>Factură #{index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    <DetailRow
                      label='Serie / Număr'
                      value={`${invoice.series || ''} ${invoice.number}`}
                    />
                    <DetailRow
                      label='Data'
                      value={format(new Date(invoice.date), 'dd MMMM yyyy')}
                    />
                    <DetailRow
                      label='Data Scadentă'
                      value={
                        invoice.dueDate
                          ? format(new Date(invoice.dueDate), 'dd MMMM yyyy')
                          : '-'
                      }
                    />
                    <DetailRow
                      label='Valoare Netă'
                      value={formatCurrency(invoice.amount)}
                    />
                    <DetailRow
                      label='Cotă TVA'
                      value={`${invoice.vatRate} %`}
                    />
                    <DetailRow
                      label='Valoare TVA'
                      value={formatCurrency(invoice.vatValue)}
                    />
                    <DetailRow
                      label='Total cu TVA'
                      value={formatCurrency(invoice.totalWithVat)}
                    />
                  </dl>
                </CardContent>
              </Card>
            ))}
          {/* Avize   */}
          {reference &&
            reference.deliveries.map((delivery, index) => (
              <Card key={`del-${index}`} className='py-3'>
                <CardHeader>
                  <CardTitle>Aviz de Însoțire #{index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl>
                    <DetailRow
                      label='Serie / Număr'
                      value={`${delivery.dispatchNoteSeries || ''} ${delivery.dispatchNoteNumber}`}
                    />
                    <DetailRow
                      label='Data'
                      value={format(
                        new Date(delivery.dispatchNoteDate),
                        'dd MMMM yyyy'
                      )}
                    />
                    <DetailRow
                      label='Șofer / Mașină'
                      value={`${delivery.driverName || '-'} / ${delivery.carNumber || '-'}`}
                    />
                    <DetailRow
                      label='Tip Transport'
                      value={
                        TRANSPORT_TYPE_MAP[delivery.transportType] ||
                        delivery.transportType
                      }
                    />
                    <DetailRow
                      label='Cost Transport'
                      value={formatCurrency(delivery.transportCost)}
                    />
                    <DetailRow label='Nota' value={delivery.notes || '-'} />
                    {delivery.transportType === 'TERT' &&
                      delivery.tertiaryTransporterDetails && (
                        <>
                          <DetailRow
                            label='Nume Transportator'
                            value={
                              delivery.tertiaryTransporterDetails.name || '-'
                            }
                          />
                          <DetailRow
                            label='CUI Transportator'
                            value={
                              delivery.tertiaryTransporterDetails.cui || '-'
                            }
                          />
                          <DetailRow
                            label='Reg. Com. Transp.'
                            value={
                              delivery.tertiaryTransporterDetails.regCom || '-'
                            }
                          />
                        </>
                      )}
                  </dl>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
