import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getReceptionById } from '@/lib/db/modules/reception/reception.actions'
import type { PopulatedReception } from '@/lib/db/modules/reception/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReceptionDetailPage({ params }: Props) {
  const { id } = await params

  const reception: PopulatedReception | null = await getReceptionById(id)

  if (!reception) {
    return (
      <Card>
        <CardContent>Recepție negăsită.</CardContent>
      </Card>
    )
  }

  const deliveries = reception.deliveries || []
  const invoices = reception.invoices || []
  const products = reception.products || []
  const packages = reception.packagingItems || []

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
        {/* Header */}
        <Card>
          <CardHeader className='flex justify-between items-center'>
            <CardTitle>Recepție #{reception._id}</CardTitle>
            <Link
              href={`/admin/management/reception/${reception._id}/edit`}
              className='bg-red-500 p-1 rounded-md text-sm text-white'
            >
              Modifică
            </Link>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div>
              <strong>Furnizor:</strong> {reception.supplier?.name || 'N/A'}
            </div>
            <div>
              <strong>Data:</strong>{' '}
              {format(new Date(reception.receptionDate), 'd MMMM yyyy', {
                locale: ro,
              })}
            </div>
            <div>
              <strong>Status:</strong>{' '}
              <Badge
                variant={reception.status === 'DRAFT' ? 'secondary' : 'default'}
              >
                {reception.status}
              </Badge>
            </div>
            <div>
              <strong>Destinație:</strong>{' '}
              {reception.destinationType === 'PROIECT'
                ? `Proiect ${reception.destinationId}`
                : reception.destinationLocation}
            </div>
          </CardContent>
        </Card>

        {/* Avize */}
        <Card>
          <CardHeader>
            <CardTitle>Avize</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <p>Nu există avize.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Număr</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Șofer</TableHead>
                    <TableHead>Mașină</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.dispatchNoteNumber}</TableCell>
                      <TableCell>
                        {format(new Date(d.dispatchNoteDate), 'd MMM yyyy', {
                          locale: ro,
                        })}
                      </TableCell>
                      <TableCell>{d.driverName || '-'}</TableCell>
                      <TableCell>{d.carNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Facturi */}
        <Card>
          <CardHeader>
            <CardTitle>Facturi</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p>Nu există facturi.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serie</TableHead>
                    <TableHead>Număr</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Suma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv, i) => (
                    <TableRow key={i}>
                      <TableCell>{inv.series || '—'}</TableCell>
                      <TableCell>{inv.number}</TableCell>
                      <TableCell>
                        {format(new Date(inv.date), 'd MMM yyyy', {
                          locale: ro,
                        })}
                      </TableCell>
                      <TableCell>
                        {inv.amount != null ? inv.amount.toFixed(2) : '–'}{' '}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Articole Recepționate */}
      <Card>
        <CardHeader>
          <CardTitle>Articole Recepționate</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          {products.length + packages.length === 0 ? (
            <p>Nu există articole.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>Denumire</TableHead>
                  <TableHead>Cantitate</TableHead>
                  <TableHead>UM</TableHead>
                  <TableHead>Preț</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...products.map((p, i) => ({
                    key: `prod-${i}`,
                    type: 'Produs',
                    name: p.product.name,
                    quantity: p.quantity,
                    unit: p.unitMeasure,
                    price: p.invoicePricePerUnit,
                  })),
                  // map ambalaje
                  ...packages.map((p, i) => ({
                    key: `amb-${i}`,
                    type: 'Ambalaj',
                    name: p.packaging.name,
                    quantity: p.quantity,
                    unit: p.unitMeasure,
                    price: p.invoicePricePerUnit,
                  })),
                ].map(({ key, type, name, quantity, unit, price }) => (
                  <TableRow key={key}>
                    <TableCell>{type}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>{quantity}</TableCell>
                    <TableCell>{unit}</TableCell>
                    <TableCell>
                      {price != null ? price.toFixed(2) : '–'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
