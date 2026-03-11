'use server'

import { PipelineStage } from 'mongoose'
import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import { format } from 'date-fns'
import InvoiceModel from '../../financial/invoices/invoice.model'
import { IN_TYPES } from '../../inventory/constants'
import {
  INVOICE_STATUS_MAP,
  EFACTURA_STATUS_MAP,
  InvoiceStatusKey,
  EFacturaStatusKey,
} from '../../financial/invoices/invoice.constants'
import { formatCurrency } from '@/lib/utils'

export async function generateSalesPeriodReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  await connectToDatabase()

  const startDate = new Date(filters.startDate)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(filters.endDate)
  endDate.setHours(23, 59, 59, 999)

  // 1. Filtrare inițială
  const matchStage: any = {
    invoiceDate: { $gte: startDate, $lte: endDate },
    invoiceType: { $ne: 'PROFORMA' },
    seriesName: { $nin: ['INIT-C', 'INIT-AMB'] },
  }

  // Filtrăm seriile dacă utilizatorul nu a lăsat bifat doar "Toate"
  if (filters.selectedSeries && filters.selectedSeries.length > 0) {
    if (!filters.selectedSeries.includes('ALL')) {
      matchStage.seriesName = { $in: filters.selectedSeries }
    }
  }

  const pipeline: PipelineStage[] = [
    { $match: matchStage },

    { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },

    // A. CĂLĂTORIA ÎN TIMP PENTRU ESTIMARE COSTURI
    {
      $lookup: {
        from: 'stockmovements',
        let: {
          prodId: '$items.productId',
          invDate: '$invoiceDate',
          cost: '$items.lineCostFIFO',
          stockType: '$items.stockableItemType',
          isManual: '$items.isManualEntry',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$$stockType', ['ERPProduct', 'Packaging']] },
                  { $ne: ['$$isManual', true] },
                  { $lte: [{ $abs: { $ifNull: ['$$cost', 0] } }, 1] },
                  { $eq: ['$stockableItem', '$$prodId'] },
                  { $in: ['$movementType', Array.from(IN_TYPES)] },
                  { $lte: ['$timestamp', '$$invDate'] },
                ],
              },
            },
          },
          { $sort: { unitCost: -1 } },
          { $limit: 1 },
        ],
        as: 'historicalStock',
      },
    },

    // B. LOGICA CHIRURGICALĂ DE ESTIMARE
    {
      $addFields: {
        historicalMaxCost: { $arrayElemAt: ['$historicalStock.unitCost', 0] },
        needsEstimation: {
          $and: [
            { $in: ['$items.stockableItemType', ['ERPProduct', 'Packaging']] },
            { $ne: ['$items.isManualEntry', true] },
            { $lte: [{ $abs: { $ifNull: ['$items.lineCostFIFO', 0] } }, 1] },
          ],
        },
      },
    },
    {
      $addFields: {
        estimatedCost: {
          $cond: [
            '$needsEstimation',
            {
              $multiply: [
                '$items.quantity',
                { $ifNull: ['$historicalMaxCost', 0] },
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        finalProfit: {
          $cond: [
            '$needsEstimation',
            {
              $cond: [
                { $gt: ['$historicalMaxCost', 0] },
                { $subtract: ['$items.lineValue', '$estimatedCost'] },
                0,
              ],
            },
            { $ifNull: ['$items.lineProfit', 0] },
          ],
        },
        isEstimated: '$needsEstimation',
      },
    },
    {
      $addFields: {
        finalMargin: {
          $cond: [
            '$needsEstimation',
            {
              $cond: [
                { $gt: [{ $abs: '$items.lineValue' }, 0] },
                {
                  $multiply: [
                    { $divide: ['$finalProfit', '$items.lineValue'] },
                    100,
                  ],
                },
                0,
              ],
            },
            { $ifNull: ['$items.lineMargin', 0] },
          ],
        },
        profitDiff: {
          $cond: [
            '$needsEstimation',
            {
              $subtract: [
                '$finalProfit',
                { $ifNull: ['$items.lineProfit', 0] },
              ],
            },
            0,
          ],
        },
      },
    },

    // 2. REGRUPAREA FACTURII
    {
      $group: {
        _id: '$_id',
        invoiceRef: {
          $first: { $concat: ['$seriesName', '-', '$invoiceNumber'] },
        },
        seriesName: { $first: '$seriesName' },
        invoiceDate: { $first: '$invoiceDate' },
        dueDate: { $first: '$dueDate' },
        clientName: { $first: '$clientSnapshot.name' },
        status: { $first: '$status' },
        eFacturaStatus: { $first: '$eFacturaStatus' },
        invoiceType: { $first: '$invoiceType' },
        creatorName: { $first: '$createdByName' },
        logisticSnapshots: { $first: '$logisticSnapshots' },

        grandTotal: { $first: '$totals.grandTotal' },
        subtotal: { $first: '$totals.subtotal' }, 
        vatTotal: { $first: '$totals.vatTotal' }, 
        productsSubtotal: { $first: '$totals.productsSubtotal' },
        productsProfit: { $first: '$totals.productsProfit' },

        productProfitDiff: {
          $sum: {
            $cond: [
              { $eq: ['$items.stockableItemType', 'ERPProduct'] },
              '$profitDiff',
              0,
            ],
          },
        },

        items: {
          $push: {
            productName: '$items.productName',
            quantity: '$items.quantity',
            unitOfMeasure: '$items.unitOfMeasure',
            unitPrice: '$items.unitPrice',
            lineValue: '$items.lineValue', // Valoare Fără TVA pe linie
            lineTotal: '$items.lineTotal', // Total Vânzare cu TVA pe linie
            lineVat: '$items.vatRateDetails.value', // Valoare TVA pe linie
            lineMargin: '$finalMargin',
            lineProfit: '$finalProfit',
            isEstimated: '$isEstimated',
          },
        },
      },
    },

    // 3. CALCUL FINAL PROFIT ESTIMAT PE FACTURĂ (Doar pentru Produse)
    {
      $addFields: {
        finalProductsProfit: {
          $add: ['$productsProfit', '$productProfitDiff'],
        },
      },
    },
    {
      $addFields: {
        finalProductsMargin: {
          $cond: [
            { $gt: ['$productsSubtotal', 0] },
            {
              $multiply: [
                { $divide: ['$finalProductsProfit', '$productsSubtotal'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    // Sortare: Cele mai noi primele
    { $sort: { invoiceDate: -1, invoiceRef: -1 } },
  ]

  const data = await InvoiceModel.aggregate(pipeline)

  if (!data || data.length === 0) {
    const sheet = workbook.addWorksheet('Fără Date')
    sheet.addRow(['Nu există facturi care să corespundă filtrelor selectate.'])
    return
  }

  // --- CALCULĂM TOTALURILE IN JAVASCRIPT ---
  let grandSubtotal = 0
  let grandVatTotal = 0
  let grandTotal = 0
  let grandProductsProfit = 0
  const seriesTotals: Record<string, number> = {}

  data.forEach((inv) => {
    if (inv.status !== 'CANCELLED') {
      grandSubtotal += inv.subtotal || 0
      grandVatTotal += inv.vatTotal || 0
      grandTotal += inv.grandTotal || 0

      if (inv.invoiceType !== 'STORNO') {
        grandProductsProfit += inv.finalProductsProfit || 0
      }

      if (!seriesTotals[inv.seriesName]) {
        seriesTotals[inv.seriesName] = 0
      }
      seriesTotals[inv.seriesName] += inv.grandTotal || 0
    }
  })

  // --- GENERARE EXCEL ---
  const sheet = workbook.addWorksheet('Vânzări', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Setăm coloanele
  sheet.columns = [
    { header: 'Serie-Nr', key: 'invoiceRef', width: 16 },
    { header: 'Data', key: 'invoiceDate', width: 12 },
    { header: 'Scadență', key: 'dueDate', width: 12 },
    { header: 'Client / Nume Produs', key: 'clientName', width: 45 },
    { header: 'Status / Cant.', key: 'status', width: 18 },
    { header: 'eFactura / UM', key: 'eFacturaStatus', width: 15 },
    { header: 'Total Fără TVA', key: 'subtotal', width: 15 },
    { header: 'Total TVA', key: 'vatTotal', width: 15 },
    { header: 'Total Vânzare', key: 'grandTotal', width: 15 },
    { header: 'Profit Prod.', key: 'finalProductsProfit', width: 15 },
    { header: 'Marjă Prod. (%)', key: 'finalProductsMargin', width: 15 },
    { header: 'Creator / Preț Unitar Fără TVA', key: 'creatorName', width: 22 },
    { header: 'Avize', key: 'deliveryNotes', width: 20 },
    { header: 'Comenzi', key: 'orders', width: 20 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F4F4F' },
  }
  headerRow.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  }
  headerRow.height = 30

  let rowIndex = 0

  data.forEach((inv) => {
    rowIndex++

    const friendlyStatus =
      INVOICE_STATUS_MAP[inv.status as InvoiceStatusKey]?.name || inv.status
    const friendlyEFactura =
      EFACTURA_STATUS_MAP[inv.eFacturaStatus as EFacturaStatusKey]?.name ||
      inv.eFacturaStatus ||
      '-'
    const isStorno = inv.invoiceType === 'STORNO'

    const invRow = sheet.addRow({
      invoiceRef: inv.invoiceRef,
      invoiceDate: format(new Date(inv.invoiceDate), 'dd.MM.yyyy'),
      dueDate: format(new Date(inv.dueDate), 'dd.MM.yyyy'),
      clientName: inv.clientName || 'N/A',
      status: friendlyStatus,
      eFacturaStatus: friendlyEFactura,
      subtotal: inv.subtotal, // ADĂUGAT
      vatTotal: inv.vatTotal, // ADĂUGAT
      grandTotal: inv.grandTotal,
      finalProductsProfit: isStorno ? null : inv.finalProductsProfit,
      finalProductsMargin: isStorno
        ? null
        : (inv.finalProductsMargin || 0) / 100,
      creatorName: inv.creatorName || '-',
      deliveryNotes:
        inv.logisticSnapshots?.deliveryNoteNumbers?.join(', ') || '-',
      orders: inv.logisticSnapshots?.orderNumbers?.join(', ') || '-',
    })

    if (rowIndex % 2 === 0) {
      invRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F9FF' },
      }
    }

    invRow.getCell('subtotal').numFmt = '#,##0.00'
    invRow.getCell('vatTotal').numFmt = '#,##0.00'
    invRow.getCell('grandTotal').numFmt = '#,##0.00'
    invRow.getCell('grandTotal').font = { bold: true }

    const profitCell = invRow.getCell('finalProductsProfit')
    const marginCell = invRow.getCell('finalProductsMargin')

    if (!isStorno) {
      profitCell.numFmt = '#,##0.00'
      marginCell.numFmt = '0.00%'

      const profitVal = inv.finalProductsProfit || 0
      const totalColor =
        profitVal < 0 ? 'FFEF4444' : profitVal > 0 ? 'FF16A34A' : 'FF6B7280'
      profitCell.font = { color: { argb: totalColor }, bold: true }
      marginCell.font = { color: { argb: totalColor }, bold: true }
    } else {
      profitCell.value = '-'
      marginCell.value = '-'
      profitCell.alignment = { horizontal: 'right' }
      marginCell.alignment = { horizontal: 'right' }
    }

    if (inv.status === 'CANCELLED') {
      invRow.font = { strike: true, color: { argb: 'FF9CA3AF' } }
    }

    invRow.eachCell((cell) => {
      cell.border = { bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } } }
      cell.alignment = { ...cell.alignment, vertical: 'middle' }
    })

    if (filters.includeDetails && inv.items && inv.items.length > 0) {
      inv.items.forEach((item: any) => {
        const detailRow = sheet.addRow({
          invoiceRef: '',
          invoiceDate: '',
          dueDate: '↳',
          clientName: item.productName || '-',
          status: item.quantity,
          eFacturaStatus: item.unitOfMeasure || '-',
          subtotal: item.lineValue,
          vatTotal: item.lineVat || 0,
          grandTotal: item.lineTotal || item.lineValue + (item.lineVat || 0),
          finalProductsProfit: item.lineProfit,
          finalProductsMargin: (item.lineMargin || 0) / 100,
          creatorName: item.unitPrice,
          deliveryNotes: '',
          orders: '',
        })

        if (rowIndex % 2 === 0) {
          detailRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F9FF' },
          }
        }

        detailRow.font = { size: 10, color: { argb: 'FF4B5563' } }

        const dQtyCell = detailRow.getCell('status')
        const dUmCell = detailRow.getCell('eFacturaStatus')
        const dPriceCell = detailRow.getCell('creatorName')

        detailRow.getCell('subtotal').numFmt = '#,##0.00'
        detailRow.getCell('vatTotal').numFmt = '#,##0.00'
        detailRow.getCell('grandTotal').numFmt = '#,##0.00'
        detailRow.getCell('finalProductsProfit').numFmt = '#,##0.00'
        detailRow.getCell('finalProductsMargin').numFmt = '0.00%'
        dPriceCell.numFmt = '#,##0.00'

        dQtyCell.alignment = { horizontal: 'center', vertical: 'middle' }
        dUmCell.alignment = { horizontal: 'center', vertical: 'middle' }
        dPriceCell.alignment = { horizontal: 'right', vertical: 'middle' }

        const lineProfitVal = item.lineProfit || 0
        const itemColor =
          lineProfitVal < 0
            ? 'FFEF4444'
            : lineProfitVal > 0
              ? 'FF16A34A'
              : 'FF6B7280'

        if (item.isEstimated) {
          const estimatedFont = {
            color: { argb: 'FFF59E0B' },
            italic: true,
            bold: true,
          }
          detailRow.getCell('clientName').font = {
            color: { argb: 'FFF59E0B' },
            italic: true,
          }
          detailRow.getCell('finalProductsProfit').font = estimatedFont
          detailRow.getCell('finalProductsMargin').font = estimatedFont
        } else {
          detailRow.getCell('finalProductsProfit').font = {
            color: { argb: itemColor },
            bold: true,
          }
          detailRow.getCell('finalProductsMargin').font = {
            color: { argb: itemColor },
            bold: true,
          }
        }

        detailRow.eachCell((cell) => {
          cell.border = {
            bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } },
          }
          cell.alignment = { ...cell.alignment, vertical: 'middle' }
        })
      })
    }
  })

  // --- ZONA DE TOTALURI LA FINAL ---
  sheet.addRow([])
  sheet.addRow([])

  // Functie helper pentru a nu repeta codul de design
  const addTotalRow = (
    label: string,
    value: number,
    isBold: boolean = true,
    color?: string,
  ) => {
    const row = sheet.addRow(['', '', '', label, formatCurrency(value)])
    row.font = { bold: isBold, size: isBold ? 12 : 11 }
    if (color) row.font.color = { argb: color }

    row.getCell(4).alignment = { horizontal: 'right' }
    try {
      sheet.mergeCells(`E${row.number}:F${row.number}`)
    } catch (e) {}
    row.getCell(5).alignment = { horizontal: 'left' }
    return row
  }

  addTotalRow('TOTAL GENERAL FĂRĂ TVA:', grandSubtotal)
  addTotalRow('TOTAL GENERAL TVA:', grandVatTotal)
  addTotalRow('TOTAL GENERAL VÂNZĂRI:', grandTotal)
  addTotalRow('TOTAL PROFIT PRODUSE:', grandProductsProfit, true, 'FF16A34A')

  sheet.addRow([])

  const seriesHeaderRow = sheet.addRow(['', '', '', 'TOTALURI PE SERII:'])
  seriesHeaderRow.font = { bold: true }
  seriesHeaderRow.getCell(4).alignment = { horizontal: 'right' }

  Object.entries(seriesTotals).forEach(([series, total]) => {
    const sRow = sheet.addRow([
      '',
      '',
      '',
      `Seria ${series}:`,
      formatCurrency(total),
    ])
    sRow.font = { italic: true }
    sRow.getCell(4).alignment = { horizontal: 'right' }
    try {
      sheet.mergeCells(`E${sRow.number}:F${sRow.number}`)
    } catch (e) {}
    sRow.getCell(5).alignment = { horizontal: 'left' }
  })

  if (filters.includeDetails) {
    sheet.addRow([])
    const noteRow = sheet.addRow([
      '* NOTĂ: Liniile cu produs și profit portocaliu (italic) au un cost ESTIMAT (marfă vândută fără stoc/preț documentat). S-a folosit cel mai mare preț istoric valabil până la data facturii. Dacă un produs nu a avut istoric deloc, profitul a fost forțat la 0 pentru a nu denatura marja.',
    ])
    try {
      sheet.mergeCells(`A${noteRow.number}:N${noteRow.number}`)
    } catch (e) {}

    const noteCell = noteRow.getCell(1)
    noteCell.font = {
      italic: true,
      bold: true,
      size: 11,
      color: { argb: 'FFF59E0B' },
    }
    noteCell.alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'left',
    }
    noteRow.height = 45
  }
}
