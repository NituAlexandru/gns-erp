'use server'

import { connectToDatabase } from '@/lib/db'
import InvoiceModel from '@/lib/db/modules/financial/invoices/invoice.model'
import { TIMEZONE } from '@/lib/constants'

export interface SalesOverviewFilterOptions {
  startDate: Date
  endDate: Date
  groupBy: 'month' | 'quarter' | 'year'
  includeDrafts?: boolean
}

export async function getSalesOverviewStats(
  filters: SalesOverviewFilterOptions,
) {
  try {
    await connectToDatabase()

    const allowedStatuses = [
      'APPROVED',
      'PAID',
      'PARTIAL_PAID',
      'SENT',
      'ACCEPTED',
    ]
    if (filters.includeDrafts) {
      allowedStatuses.push('CREATED', 'REJECTED')
    }

    const prevYearStart = new Date(filters.startDate)
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1)

    const prevYearStartStr = prevYearStart.toISOString().split('T')[0]
    const endDateStr = filters.endDate.toISOString().split('T')[0]

    let dateGroupExpression: any = {}

    if (filters.groupBy === 'year') {
      dateGroupExpression = {
        $dateToString: {
          format: '%Y',
          date: '$invoiceDate',
          timezone: TIMEZONE,
        },
      }
    } else if (filters.groupBy === 'quarter') {
      dateGroupExpression = {
        $concat: [
          {
            $toString: { $year: { date: '$invoiceDate', timezone: TIMEZONE } },
          },
          '-Q',
          {
            $toString: {
              $ceil: {
                $divide: [
                  { $month: { date: '$invoiceDate', timezone: TIMEZONE } },
                  3,
                ],
              },
            },
          },
        ],
      }
    } else {
      dateGroupExpression = {
        $dateToString: {
          format: '%Y-%m',
          date: '$invoiceDate',
          timezone: TIMEZONE,
        },
      }
    }

    const pipeline = [
      {
        $match: {
          invoiceType: { $ne: 'PROFORMA' },
          seriesName: { $nin: ['INIT-C', 'INIT-AMB'] },
          status: { $in: allowedStatuses },
          $expr: {
            $and: [
              {
                $gte: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$invoiceDate',
                      timezone: TIMEZONE,
                    },
                  },
                  prevYearStartStr,
                ],
              },
              {
                $lte: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$invoiceDate',
                      timezone: TIMEZONE,
                    },
                  },
                  endDateStr,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            date: dateGroupExpression,
            series: '$seriesName',
          },
          net: { $sum: '$totals.subtotal' },
          vat: { $sum: '$totals.vatTotal' },
          gross: { $sum: '$totals.grandTotal' },
        },
      },
    ]

    const result = await InvoiceModel.aggregate(pipeline)

    const uniqueSeries = Array.from(
      new Set(result.map((r) => r._id.series)),
    ).sort((a, b) => a.localeCompare(b)) as string[]

    const dataByDate: Record<string, any> = {}
    result.forEach((row) => {
      const date = row._id.date
      const series = row._id.series
      if (!dataByDate[date]) {
        dataByDate[date] = { date, total_net: 0, total_vat: 0, total_gross: 0 }
      }
      dataByDate[date][`${series}_net`] = row.net || 0
      dataByDate[date][`${series}_vat`] = row.vat || 0
      dataByDate[date][`${series}_gross`] = row.gross || 0

      dataByDate[date].total_net += row.net || 0
      dataByDate[date].total_vat += row.vat || 0
      dataByDate[date].total_gross += row.gross || 0
    })

    const getPrevPeriod = (dateStr: string, groupBy: string) => {
      if (groupBy === 'year') return (parseInt(dateStr) - 1).toString()
      if (groupBy === 'month') {
        const [y, m] = dateStr.split('-')
        return `${parseInt(y) - 1}-${m}`
      }
      if (groupBy === 'quarter') {
        const [y, q] = dateStr.split('-Q')
        return `${parseInt(y) - 1}-Q${q}`
      }
      return ''
    }

    let minDateStr = ''
    if (filters.groupBy === 'year') {
      minDateStr = filters.startDate.getFullYear().toString()
    } else if (filters.groupBy === 'month') {
      minDateStr = `${filters.startDate.getFullYear()}-${(filters.startDate.getMonth() + 1).toString().padStart(2, '0')}`
    } else {
      const q = Math.ceil((filters.startDate.getMonth() + 1) / 3)
      minDateStr = `${filters.startDate.getFullYear()}-Q${q}`
    }

    const chartData: any[] = []

    Object.values(dataByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((item) => {
        if (item.date >= minDateStr) {
          const prevItem = dataByDate[getPrevPeriod(item.date, filters.groupBy)]

          item.yoy_net = prevItem?.total_net
            ? ((item.total_net - prevItem.total_net) /
                Math.abs(prevItem.total_net)) *
              100
            : null
          item.yoy_vat = prevItem?.total_vat
            ? ((item.total_vat - prevItem.total_vat) /
                Math.abs(prevItem.total_vat)) *
              100
            : null
          item.yoy_gross = prevItem?.total_gross
            ? ((item.total_gross - prevItem.total_gross) /
                Math.abs(prevItem.total_gross)) *
              100
            : null

          uniqueSeries.forEach((series) => {
            const prevNet = prevItem ? prevItem[`${series}_net`] || 0 : 0
            item[`${series}_yoy_net`] = prevNet
              ? (((item[`${series}_net`] || 0) - prevNet) / Math.abs(prevNet)) *
                100
              : null

            const prevVat = prevItem ? prevItem[`${series}_vat`] || 0 : 0
            item[`${series}_yoy_vat`] = prevVat
              ? (((item[`${series}_vat`] || 0) - prevVat) / Math.abs(prevVat)) *
                100
              : null

            const prevGross = prevItem ? prevItem[`${series}_gross`] || 0 : 0
            item[`${series}_yoy_gross`] = prevGross
              ? (((item[`${series}_gross`] || 0) - prevGross) /
                  Math.abs(prevGross)) *
                100
              : null
          })

          chartData.push(item)
        }
      })

    return { success: true, data: { chartData, uniqueSeries } }
  } catch (error) {
    console.error('Error in getSalesOverviewStats:', error)
    return { success: false, message: 'Eroare server.' }
  }
}
