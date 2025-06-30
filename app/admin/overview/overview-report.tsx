'use client'
import { BadgeDollarSign, Barcode, CreditCard, Users } from 'lucide-react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculatePastDate, formatDateTime, formatNumber } from '@/lib/utils'
import SalesCategoryPieChart from './sales-category-pie-chart'
import React, { useEffect, useState, useTransition } from 'react'
import { DateRange } from 'react-day-picker'
import { getOrderSummary } from '@/lib/db/modules/order/order.actions'
import SalesAreaChart from './sales-area-chart'
import { CalendarDateRangePicker } from './date-range-picker'
import { IOrderList } from '@/types'
import ProductPrice from '@/components/shared/product/product-price'
import TableChart from './table-chart'
import { Skeleton } from '@/components/ui/skeleton'
import SalesCategoryBySumPieChart from './sales-category-by-sum-pie-chart'

import MonthlyEarnings from './monthly-earnings'

export default function OverviewReport() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: calculatePastDate(30),
    to: new Date(),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<{ [key: string]: any }>()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (date) {
      startTransition(async () => {
        setData(await getOrderSummary(date))
      })
    }
  }, [date])

  if (!data || isPending)
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='h1-bold'>Dashboard</h1>
        </div>
        {/* First Row */}
        <div className='flex gap-4'>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className='h-36 w-full' />
          ))}
        </div>

        {/* Second Row */}
        <div>
          <Skeleton className='h-[30rem] w-full' />
        </div>

        {/* Third Row */}
        <div className='flex gap-4'>
          {[...Array(2)].map((_, index) => (
            <Skeleton key={index} className='h-60 w-full' />
          ))}
        </div>

        {/* Fourth Row */}
        <div className='flex gap-4'>
          {[...Array(2)].map((_, index) => (
            <Skeleton key={index} className='h-60 w-full' />
          ))}
        </div>
      </div>
    )

  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <h1 className='h1-bold'>Dashboard</h1>
        <CalendarDateRangePicker defaultDate={date} setDate={setDate} />
      </div>
      <div className='space-y-4'>
        <div className='grid gap-4  grid-cols-2 lg:grid-cols-4'>
          {' '}
          <Link className='text-xs' href='/admin/orders'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Venit total
                </CardTitle>
                <BadgeDollarSign />
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='text-2xl font-bold'>
                  <ProductPrice price={data.totalSales} plain />
                </div>
                <div>Vezi venitul</div>
              </CardContent>
            </Card>{' '}
          </Link>
          <Link className='text-xs' href='/admin/orders'>
            {' '}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Vânzări</CardTitle>
                <CreditCard />
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='text-2xl font-bold'>
                  {formatNumber(data.ordersCount)}
                </div>
                <div>Vezi vânzările</div>
              </CardContent>
            </Card>{' '}
          </Link>
          <Link className='text-xs' href='/admin/users'>
            {' '}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Utilizatori
                </CardTitle>
                <Users />
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='text-2xl font-bold'>{data.usersCount}</div>
                <div>Vezi utilizatorii</div>
              </CardContent>
            </Card>{' '}
          </Link>
          <Link className='text-xs' href='/admin/products'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Produse</CardTitle>
                <Barcode />
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='text-2xl font-bold'>{data.productsCount}</div>
                <div>Vezi produsele</div>
              </CardContent>
            </Card>{' '}
          </Link>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Vânzări</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesAreaChart data={data.salesChartData} />
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Cât ai câștigat</CardTitle>
              <CardDescription>Estimat · Ultimele 6 luni</CardDescription>
              <div className='mt-2 flex items-center space-x-4'>
                <div className='flex items-center space-x-1'>
                  <span className='inline-block w-3 h-3 bg-green-500 rounded-sm' />
                  <span className='text-xs text-green-500 font-medium'>
                    Profit
                  </span>
                </div>
                <div className='flex items-center space-x-1'>
                  <span className='inline-block w-3 h-3 bg-blue-500 rounded-sm' />
                  <span className='text-xs text-blue-500 font-medium'>
                    Transport
                  </span>
                </div>
                <div className='flex items-center space-x-1'>
                  <span className='inline-block w-3 h-3 bg-red-500 rounded-sm' />
                  <span className='text-xs text-red-500 font-medium'>
                    Vanzari
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MonthlyEarnings
                monthlySales={data.monthlySales}
                monthlyCost={data.monthlyCost}
                monthlyShipping={data.monthlyShipping}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Performanța produselor</CardTitle>
              <CardDescription>
                {formatDateTime(date!.from!).dateOnly} -{' '}
                {formatDateTime(date!.to!).dateOnly}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableChart data={data.topSalesProducts} labelType='product' />
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>
                Categorii cele mai bine vândute (după cantitate)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesCategoryPieChart data={data.topSalesCategories} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Categorii cele mai bine vândute (după sumă)</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesCategoryBySumPieChart data={data.topSalesCategoriesBySum} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Vânzări recente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cumpărător</TableHead>
                    <TableHead>Dată</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.latestOrders.map((order: IOrderList) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        {order.user ? order.user.name : 'Deleted User'}
                      </TableCell>

                      <TableCell>
                        {formatDateTime(order.createdAt).dateOnly}
                      </TableCell>
                      <TableCell>
                        <ProductPrice price={order.totalPrice} plain />
                      </TableCell>

                      <TableCell>
                        <Link href={`/admin/orders/${order._id}`}>
                          <span className='px-2'>Details</span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
