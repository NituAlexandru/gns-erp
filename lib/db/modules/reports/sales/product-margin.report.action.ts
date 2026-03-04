import { PipelineStage } from 'mongoose'
import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import { format } from 'date-fns'
import InvoiceModel from '../../financial/invoices/invoice.model'
import { IN_TYPES } from '../../inventory/constants'

export async function generateProductMarginReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  await connectToDatabase()

  const startDate = new Date(filters.startDate)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(filters.endDate)
  endDate.setHours(23, 59, 59, 999)

  const typeConditions: any[] = []

  if (filters.includeManual) {
    typeConditions.push({ 'items.isManualEntry': true })
  }
  if (filters.includeProducts) {
    typeConditions.push({
      'items.isManualEntry': { $ne: true },
      'items.serviceId': { $exists: false },
      'items.stockableItemType': 'ERPProduct',
    })
  }
  if (filters.includePackaging) {
    typeConditions.push({
      'items.isManualEntry': { $ne: true },
      'items.serviceId': { $exists: false },
      'items.stockableItemType': 'Packaging',
    })
  }
  if (filters.includeServices) {
    typeConditions.push({
      'items.isManualEntry': { $ne: true },
      'items.serviceId': { $exists: true },
    })
  }

  if (typeConditions.length === 0) {
    const sheet = workbook.addWorksheet('Eroare Filtre')
    sheet.addRow(['Nu ați selectat niciun tip de articol pentru raport.'])
    return
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        invoiceDate: { $gte: startDate, $lte: endDate },
        invoiceType: { $ne: 'PROFORMA' },
        status: { $nin: ['CANCELLED', 'REJECTED', 'CREATED'] },
      },
    },
    { $unwind: '$items' },
    { $match: { $or: typeConditions } },

    // Călătorie în timp pt istoric de prețuri
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

    // --- LOGICA CHIRURGICALĂ DE ESTIMARE ---
    {
      $addFields: {
        historicalMaxCost: { $arrayElemAt: ['$historicalStock.unitCost', 0] },
        // Stabilim strict care linii necesită ajustare
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
            // Dacă necesită estimare, calculăm profitul forțat sau îl facem 0 dacă nu e istoric
            {
              $cond: [
                { $gt: ['$historicalMaxCost', 0] },
                { $subtract: ['$items.lineValue', '$estimatedCost'] },
                0, // Failsafe: Profit 0
              ],
            },
            // Dacă NU necesită estimare, folosim PROFITUL ORIGINAL fără să-l atingem!
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
            // Dacă a fost estimat, calculăm noul procentaj
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
            // Dacă nu, folosim MARJA ORIGINALĂ
            { $ifNull: ['$items.lineMargin', 0] },
          ],
        },
        // Diferența cu care ajustăm totalul facturii
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

    // Regrupăm liniile înapoi în formatul facturii
    {
      $group: {
        _id: '$_id',
        invoiceRef: {
          $first: { $concat: ['$seriesName', '-', '$invoiceNumber'] },
        },
        invoiceDate: { $first: '$invoiceDate' },
        agentName: { $first: '$salesAgentSnapshot.name' },

        originalTotalProfit: { $first: '$totals.totalProfit' },
        originalSubtotal: { $first: '$totals.subtotal' },
        totalProfitDiff: { $sum: '$profitDiff' },

        items: {
          $push: {
            productName: '$items.productName',
            unitOfMeasure: '$items.unitOfMeasure',
            unitPrice: '$items.unitPrice',
            lineMargin: '$finalMargin',
            lineProfit: '$finalProfit',
            isEstimated: '$isEstimated',
          },
        },
      },
    },
    // Calculăm Totalurile Finale ale facturii
    {
      $addFields: {
        totalProfitAmount: {
          $add: ['$originalTotalProfit', '$totalProfitDiff'],
        },
      },
    },
    {
      $addFields: {
        totalProfitMargin: {
          $cond: [
            { $gt: ['$originalSubtotal', 0] },
            {
              $multiply: [
                { $divide: ['$totalProfitAmount', '$originalSubtotal'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { invoiceDate: 1 } },
  ]

  const data = await InvoiceModel.aggregate(pipeline)

  if (!data || data.length === 0) {
    const sheet = workbook.addWorksheet('Fără Date')
    sheet.addRow(['Nu există facturi care să corespundă filtrelor selectate.'])
    return
  }

  let maxItems = 0
  data.forEach((inv) => {
    if (inv.items && inv.items.length > maxItems) {
      maxItems = inv.items.length
    }
  })

  const sheet = workbook.addWorksheet('Marje pe Produse', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
  })

  const columns: any[] = [
    { header: 'Factură', key: 'invoiceRef', width: 15 },
    { header: 'Data Facturii', key: 'invoiceDate', width: 13 },
    { header: 'Agent Vânzări', key: 'agentName', width: 22 },
    {
      header: 'Profit \nFactură (%)',
      key: 'totalProfitMargin',
      width: 15,
    },
    {
      header: 'Total Profit \nFactură (Sumă)',
      key: 'totalProfitAmount',
      width: 15,
    },
  ]

  for (let i = 1; i <= maxItems; i++) {
    columns.push(
      { header: `Nume Produs ${i}`, key: `prodName_${i}`, width: 40 },
      { header: `UM ${i}`, key: `prodUm_${i}`, width: 8 },
      { header: `Preț Unitar ${i}`, key: `prodPrice_${i}`, width: 10 },
      { header: `Marjă ${i}\n(%)`, key: `prodMargin_${i}`, width: 9 },
      { header: `Profit ${i}`, key: `prodProfit_${i}`, width: 10 },
    )
  }

  sheet.columns = columns

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F4F4F' },
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  }
  headerRow.height = 40

  let rowIndex = 0
  let sumProfitReal = 0
  let sumProfitEstimat = 0
  let sumTotalProfitFactura = 0

  for (const rowData of data) {
    rowIndex++
    sumTotalProfitFactura += rowData.totalProfitAmount || 0
    const rowObj: any = {
      invoiceRef: rowData.invoiceRef,
      invoiceDate: format(new Date(rowData.invoiceDate), 'dd.MM.yyyy'),
      agentName: rowData.agentName || 'N/A',
      totalProfitMargin: (rowData.totalProfitMargin || 0) / 100,
      totalProfitAmount: rowData.totalProfitAmount || 0,
    }

    rowData.items.forEach((item: any, index: number) => {
      const i = index + 1
      rowObj[`prodName_${i}`] = item.productName || '-'
      rowObj[`prodUm_${i}`] = item.unitOfMeasure || '-'
      rowObj[`prodPrice_${i}`] = item.unitPrice || 0
      rowObj[`prodMargin_${i}`] = (item.lineMargin || 0) / 100
      rowObj[`prodProfit_${i}`] = item.lineProfit || 0
    })

    const row = sheet.addRow(rowObj)

    if (rowIndex % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F9FF' },
      }
    }

    const totalMarginCell = row.getCell('totalProfitMargin')
    const totalProfitCell = row.getCell('totalProfitAmount')
    const totalColor =
      rowData.totalProfitAmount < 0
        ? 'FFEF4444'
        : rowData.totalProfitAmount > 0
          ? 'FF16A34A'
          : 'FF6B7280'

    totalMarginCell.font = { color: { argb: totalColor }, bold: true }
    totalProfitCell.font = { color: { argb: totalColor }, bold: true }

    rowData.items.forEach((item: any, index: number) => {
      const i = index + 1
      const profitVal = item.lineProfit || 0
      if (item.isEstimated) {
        sumProfitEstimat += profitVal
      } else {
        sumProfitReal += profitVal
      }
      const nameCell = row.getCell(`prodName_${i}`)
      const umCell = row.getCell(`prodUm_${i}`)
      const priceCell = row.getCell(`prodPrice_${i}`)
      const marginCell = row.getCell(`prodMargin_${i}`)
      const profitCell = row.getCell(`prodProfit_${i}`)

      const isEstimated = item.isEstimated

      const itemColor =
        profitVal < 0 ? 'FFEF4444' : profitVal > 0 ? 'FF16A34A' : 'FF6B7280'

      if (isEstimated) {
        const estimatedFont = {
          color: { argb: 'FFF59E0B' },
          italic: true,
          bold: true,
        }
        nameCell.font = { color: { argb: 'FFF59E0B' }, italic: true }
        marginCell.font = estimatedFont
        profitCell.font = estimatedFont
      } else {
        marginCell.font = { color: { argb: itemColor }, bold: true }
        profitCell.font = { color: { argb: itemColor }, bold: true }
      }

      marginCell.numFmt = '0.00%'
      profitCell.numFmt = '#,##0.00'
      priceCell.numFmt = '#,##0.00'

      marginCell.alignment = { horizontal: 'center' }
      umCell.alignment = { horizontal: 'center' }
      priceCell.alignment = { horizontal: 'right' }
    })

    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } } }
      cell.alignment = { ...cell.alignment, vertical: 'middle' }
    })
  }

  sheet.getColumn('invoiceDate').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }
  sheet.getColumn('invoiceRef').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }
  sheet.getColumn('totalProfitMargin').numFmt = '0.00%'
  sheet.getColumn('totalProfitMargin').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }
  sheet.getColumn('totalProfitAmount').numFmt = '#,##0.00'

  sheet.addRow([])

  const rowReal = sheet.addRow({
    totalProfitMargin: 'Total produse (preț real):',
    totalProfitAmount: sumProfitReal,
  })
  rowReal.getCell('totalProfitMargin').alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }
  rowReal.getCell('totalProfitMargin').font = { bold: true }
  rowReal.getCell('totalProfitMargin').numFmt = '@' // Text simplu
  rowReal.getCell('totalProfitAmount').font = {
    bold: true,
    color: { argb: 'FF16A34A' },
  } // Verde

  const rowEst = sheet.addRow({
    totalProfitMargin: 'Total produse (estimat):',
    totalProfitAmount: sumProfitEstimat,
  })
  rowEst.getCell('totalProfitMargin').alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }
  rowEst.getCell('totalProfitMargin').font = {
    bold: true,
    italic: true,
    color: { argb: 'FFF59E0B' },
  }
  rowEst.getCell('totalProfitMargin').numFmt = '@'
  rowEst.getCell('totalProfitAmount').font = {
    bold: true,
    italic: true,
    color: { argb: 'FFF59E0B' },
  } // Portocaliu

  const rowTotal = sheet.addRow({
    totalProfitMargin: 'TOTAL GENERAL FACTURI:',
    totalProfitAmount: sumTotalProfitFactura,
  })
  rowTotal.getCell('totalProfitMargin').alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }
  rowTotal.getCell('totalProfitMargin').font = { bold: true, size: 11 }
  rowTotal.getCell('totalProfitMargin').numFmt = '@'
  rowTotal.getCell('totalProfitAmount').font = { bold: true, size: 11 }

  // --- MODIFICAT: Legendă explicativă (cu wrap și lățime dinamică) ---
  sheet.addRow([])
  const noteRow = sheet.addRow([
    '* NOTĂ: Liniile cu profit portocaliu (italic) au un cost ESTIMAT (marfă vândută fără stoc/preț documentat). S-a folosit cel mai mare preț istoric valabil până la data facturii. Dacă un produs nu a avut istoric deloc, profitul a fost forțat la 0 pentru a nu denatura marja.',
  ])
  try {
    // Calculăm dinamic ultima literă de coloană (ex: J, K, Z, AA) pentru a face merge peste tot tabelul
    const lastColLetter = sheet.getColumn(columns.length).letter
    sheet.mergeCells(`A${noteRow.number}:${lastColLetter}${noteRow.number}`)
  } catch (e) {}

  const noteCell = noteRow.getCell(1)
  noteCell.font = {
    italic: true,
    bold: true,
    size: 11,
    color: { argb: 'FFF59E0B' },
  }
  // wrapText permite extinderea textului pe mai multe rânduri
  noteCell.alignment = {
    wrapText: true,
    vertical: 'middle',
    horizontal: 'left',
  }
  noteRow.height = 45 // Am mărit înălțimea pentru a încăpea textul
}
