'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Calendar,
  Truck,
  Building2,
  FileText,
  User,
  MapPin,
  Edit,
  ExternalLink,
  PackageCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency, cn } from '@/lib/utils'
import { ISupplierOrderDoc } from '@/lib/db/modules/supplier-orders/supplier-order.types'
import { SupplierOrderStatusBadge } from '../components/SupplierOrderStatusBadge'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import { TRANSPORT_TYPE_LABELS } from '@/lib/db/modules/supplier-orders/supplier-order.constants'
import Link from 'next/link'

interface SupplierOrderDetailPageProps {
  order: ISupplierOrderDoc
}

export default function SupplierOrderDetailPage({
  order,
}: SupplierOrderDetailPageProps) {
  const router = useRouter()

  return (
    <div className='flex flex-col gap-2 w-full p-4'>
      {/* --- HEADER --- */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.back()}
            className='mr-2'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight flex items-center gap-3'>
              Comanda #{order.orderNumber}
              <SupplierOrderStatusBadge status={order.status} />
            </h1>
            <p className='text-muted-foreground text-sm flex items-center gap-2 mt-1'>
              <Calendar className='h-3.5 w-3.5' />
              Creată pe:{' '}
              {new Date(order.orderDate).toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className='flex gap-2'>
          {/* Afișăm butonul de editare doar dacă statusul permite */}
          {['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_DELIVERED'].includes(
            order.status
          ) && (
            <Button
              variant='outline'
              onClick={() =>
                router.push(
                  `/admin/management/supplier-orders/${order._id}/edit`
                )
              }
            >
              <Edit className='h-4 w-4 mr-2' />
              Modifică
            </Button>
          )}
          {/* Aici ar veni butonul de PDF */}
          <Button>Exportă PDF</Button>
        </div>
      </div>

      <Separator className='my-2' />

      {/* --- GRID INFORMAȚII --- */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2'>
        {/* 1. Detalii Generale */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <FileText className='h-4 w-4' /> Referințe
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Nr. Intern:</span>
              <span className='font-medium'>{order.orderNumber}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Ref. Furnizor:</span>
              <span className='font-medium'>
                {order.supplierOrderNumber || '-'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Data Ref. Furnizor:</span>
              <span>
                {order.supplierOrderDate
                  ? new Date(order.supplierOrderDate).toLocaleDateString(
                      'ro-RO'
                    )
                  : '-'}
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-muted-foreground flex items-center gap-1'>
                <User className='h-3 w-3' /> Creat de:
              </span>
              <span className='font-medium truncate max-w-[150px]'>
                {order.createdByName}
              </span>
            </div>
          </CardContent>
        </Card>
        {/* 2. Furnizor */}
        <Card>
          <CardHeader className='pb-1'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <Building2 className='h-4 w-4' /> Furnizor{' '}
              <div className='font-bold text-lg'>
                {order.supplierSnapshot?.name}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <Separator />
            <div className='flex flex-col gap-1'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>CUI:</span>
                <span>{order.supplierSnapshot?.cui}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Reg. Com:</span>
                <span>{order.supplierSnapshot?.regCom}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Persoana Contact:</span>
                <span>{order.supplierSnapshot?.contactName}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Telefon:</span>
                <span>{order.supplierSnapshot?.phone}</span>
              </div>
            </div>
            <div className='flex gap-2 items-start'>
              <MapPin className='h-5 w-5 mt-1 text-muted-foreground' />
              <span className='text-muted-foreground text-xs'>
                Str. {order.supplierSnapshot?.address.strada}, nr.{' '}
                {order.supplierSnapshot?.address.numar},{' '}
                {order.supplierSnapshot?.address.alteDetalii},{' '}
                {order.supplierSnapshot?.address.localitate},{' '}
                {order.supplierSnapshot?.address.judet},{' '}
                {order.supplierSnapshot?.address.codPostal}
              </span>
            </div>
          </CardContent>
        </Card>
        {/* 3. Transport & Destinație */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <Truck className='h-4 w-4' /> Livrare & Transport
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <Separator />
            <div className='flex flex-col '>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Destinație:</span>
                <span>
                  {LOCATION_NAMES_MAP[
                    order.destinationType as keyof typeof LOCATION_NAMES_MAP
                  ] || order.destinationType}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Tip Transport: </span>
                <span className='text-foreground font-medium text-right'>
                  {/* Folosim maparea, cu fallback pe valoarea din DB */}
                  {order.transportDetails?.transportType
                    ? TRANSPORT_TYPE_LABELS[
                        order.transportDetails
                          .transportType as keyof typeof TRANSPORT_TYPE_LABELS
                      ] || order.transportDetails.transportType
                    : '-'}
                </span>
              </div>
            </div>
            {order.transportDetails?.driverName && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Șofer/Auto:</span>
                <span
                  title={`${order.transportDetails.driverName} (${order.transportDetails.carNumber})`}
                >
                  {order.transportDetails.driverName}
                  <span className='text-muted-foreground'>
                    {' '}
                    ({order.transportDetails.carNumber})
                  </span>
                </span>
              </div>
            )}
            <div className='flex justify-between font-medium pt-1'>
              <span className='text-muted-foreground'>
                Cost Transport / Cursa (Net):
              </span>
              <span>
                {formatCurrency(
                  order.transportDetails?.totalTransportCost || 0
                )}
              </span>
            </div>
          </CardContent>
        </Card>
        {/* 4. Tabel Totaluri */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <FileText className='h-4 w-4' /> Total
            </CardTitle>
          </CardHeader>
          <CardContent className=' space-y-3'>
            <Separator />
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Total Marfă (Net):</span>
              <span>
                {formatCurrency(
                  (order.totalValue || 0) -
                    (order.transportDetails?.totalTransportCost || 0)
                )}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>
                Total Transport (Net):
              </span>
              <span>
                {formatCurrency(
                  order.transportDetails?.totalTransportCost || 0
                )}
              </span>
            </div>
            <div className='flex justify-between font-semibold'>
              <span>Total General (Net):</span>
              <span>{formatCurrency(order.totalValue)}</span>
            </div>
            <div className='flex justify-between text-sm text-muted-foreground'>
              <span>Total TVA:</span>
              <span>{formatCurrency(order.totalVat)}</span>
            </div>
            <Separator className='my-2' />
            <div className='flex justify-between text-xl font-bold text-primary'>
              <span>Total de Plată:</span>
              <span>{formatCurrency(order.grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-2'>
        {/* --- TABEL PRODUSE --- */}
        <Card className='col-span-3'>
          <CardHeader>
            <CardTitle>Articole Comandate</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[30px]'>#</TableHead>
                  <TableHead>Produs / Cod</TableHead>
                  <TableHead className='text-right'>Cant. Comandată</TableHead>
                  <TableHead className='text-right'>
                    Cant. Recepționată
                  </TableHead>
                  <TableHead className='text-right'>Preț Unitar</TableHead>
                  <TableHead className='text-right'>TVA %</TableHead>
                  <TableHead className='text-right'>Total Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Secțiunea PRODUSE */}
                {order.products?.map((item, idx) => (
                  <TableRow key={`prod-${idx}`}>
                    <TableCell className='text-muted-foreground text-xs'>
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{item.productName}</span>
                        <span className='text-xs text-muted-foreground'>
                          Cod: {item.productCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex flex-col items-end'>
                        {/* Cantitatea de BAZĂ (calculată) */}
                        <span className='font-medium'>
                          {item.quantityOrdered?.toLocaleString('ro-RO')}{' '}
                          {item.unitMeasure}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex flex-col items-end'>
                        <span
                          className={cn(
                            'font-medium',
                            (item.quantityReceived || 0) ===
                              item.quantityOrdered
                              ? 'text-green-600'
                              : (item.quantityReceived || 0) > 0
                                ? 'text-orange-500'
                                : 'text-muted-foreground'
                          )}
                        >
                          {(item.quantityReceived || 0).toLocaleString('ro-RO')}{' '}
                          {item.unitMeasure}
                        </span>
                        {/* Progres bar simplu text */}
                        <span className='text-[10px] text-muted-foreground'>
                          Livrat: {item.quantityReceived} {item.unitMeasure} -{' '}
                          {Math.round(
                            ((item.quantityReceived || 0) /
                              item.quantityOrdered) *
                              100
                          )}
                          %
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex flex-col items-end'>
                        <span>
                          {formatCurrency(item.pricePerUnit)} /{' '}
                          {item.unitMeasure}
                        </span>
                        {/* Afișăm și prețul original dacă a fost conversie */}
                        {item.pricePerUnit !== item.originalPricePerUnit && (
                          <span className='text-xs text-muted-foreground'>
                            ({formatCurrency(item.originalPricePerUnit || 0)}) /{' '}
                            {item.originalUnitMeasure}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.vatRate}%
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Secțiunea AMBALAJE */}
                {order.packagingItems && order.packagingItems.length > 0 && (
                  <>
                    <TableRow className='bg-muted/50 hover:bg-muted/50'>
                      <TableCell
                        colSpan={7}
                        className='font-semibold text-xs py-2'
                      >
                        AMBALAJE & PALETIZARE
                      </TableCell>
                    </TableRow>
                    {order.packagingItems.map((item, idx) => (
                      <TableRow key={`pkg-${idx}`}>
                        <TableCell className='text-muted-foreground text-xs'>
                          A{idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span className='font-medium'>
                              {item.packagingName}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              Cod: {item.productCode}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex flex-col items-end'>
                            <span className='font-medium'>
                              {item.quantityOrdered?.toLocaleString('ro-RO')}{' '}
                              {item.unitMeasure}
                            </span>
                            {item.unitMeasure !== item.originalUnitMeasure && (
                              <span className='text-xs text-muted-foreground'>
                                (Orig: {item.originalQuantity}{' '}
                                {item.originalUnitMeasure})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          <span
                            className={cn(
                              (item.quantityReceived || 0) ===
                                item.quantityOrdered
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            )}
                          >
                            {(item.quantityReceived || 0).toLocaleString(
                              'ro-RO'
                            )}{' '}
                            {item.unitMeasure}
                          </span>
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatCurrency(item.pricePerUnit)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.vatRate}%
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          {formatCurrency(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Notițe */}
        {order.notes && (
          <Card className='col-span-1'>
            <CardHeader className='py-3'>
              <CardTitle className='text-sm'>Note Comandă</CardTitle>
            </CardHeader>
            <CardContent className='text-sm text-muted-foreground whitespace-pre-wrap py-3'>
              {order.notes}
            </CardContent>
          </Card>
        )}
      </div>
      {/* --- TABEL RECEPTII (NOU) --- */}
      {order.receptions && order.receptions.length > 0 && (
        <Card>
          <CardHeader className='pb-0'>
            <CardTitle className='text-lg flex items-center gap-2'>
              <PackageCheck className='h-5 w-5 text-green-600' />
              Recepții Efectuate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead>Număr Recepție</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className='text-right'>Valoare (RON)</TableHead>
                  <TableHead className='w-[100px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.receptions.map((reception, rIdx) => (
                  <TableRow key={`rec-${rIdx}`}>
                    <TableCell className='font-medium'>
                      {reception.receptionNumber}
                    </TableCell>
                    <TableCell>
                      {reception.receptionDate
                        ? new Date(reception.receptionDate).toLocaleDateString(
                            'ro-RO',
                            { day: '2-digit', month: 'long', year: 'numeric' }
                          )
                        : '-'}
                    </TableCell>
                    <TableCell className='text-right font-mono'>
                      {formatCurrency(reception.totalValue)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button variant='ghost' size='sm' asChild>
                        <Link
                          href={`/admin/management/reception/${reception.receptionId}`}
                        >
                          <ExternalLink className='h-4 w-4 mr-1' />
                          Deschide
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
