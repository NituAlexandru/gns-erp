'use server'

import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import StockMovementModel from '../../inventory/movement.model'
import { LOCATION_NAMES_MAP, IN_TYPES } from '../../inventory/constants'
import mongoose from 'mongoose'
import '@/lib/db/modules/product/product.model'
import '@/lib/db/modules/packaging-products/packaging.model'
import '@/lib/db/modules/category/category.model'

export async function generateInventoryHistory(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  await connectToDatabase()

  const sheet = workbook.addWorksheet('Istoric Stoc', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // 1. Configurare Coloane (Curățate de date irelevante istoric)
  sheet.columns = [
    { header: 'Cod', key: 'code', width: 12 },
    { header: 'Nume Produs / Ambalaj', key: 'name', width: 80 },
    { header: 'Categorie', key: 'category', width: 25 },
    { header: 'Tip', key: 'type', width: 12 },
    { header: 'Locație', key: 'location', width: 15 },
    { header: 'UM', key: 'unit', width: 8 },
    { header: 'Stoc Total', key: 'qty', width: 15 },
    { header: 'Preț Mediu (Istoric)', key: 'avgPrice', width: 20 },
    { header: 'Valoare Totală', key: 'totalValue', width: 20 },
  ]

  // 2. Stilizare Header
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F4F4F' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  // 3. Construirea Filtrului ($match)
  const targetDate = new Date(filters.targetDate)
  targetDate.setHours(23, 59, 59, 999)

  const matchStage: any = {
    timestamp: { $lte: targetDate },
    status: { $ne: 'CANCELLED' }, // Ignorăm mișcările anulate
  }

  if (filters.itemType && filters.itemType !== 'ALL') {
    matchStage.stockableItemType = filters.itemType
  }

  const inTypesArray = Array.from(IN_TYPES)

  // 4. Pipeline-ul de agregare (Matematica Dinamică IN - OUT pură)
  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },

    // A. Stabilim locația corectă (unde s-a adunat/scăzut efectiv)
    {
      $addFields: {
        effectiveLocation: {
          $cond: [
            { $in: ['$movementType', inTypesArray] },
            '$locationTo',
            '$locationFrom',
          ],
        },
      },
    },

    // B. Filtru pe locație
    ...(filters.location !== 'ALL'
      ? [
          {
            $match: { effectiveLocation: filters.location },
          } as mongoose.PipelineStage,
        ]
      : []),

    // C. Lookup date produs/ambalaj pentru detalii (Nume, Cod, Categorie)
    {
      $lookup: {
        from: 'erpproducts',
        localField: 'stockableItem',
        foreignField: '_id',
        as: 'productData',
      },
    },
    {
      $lookup: {
        from: 'packagings',
        localField: 'stockableItem',
        foreignField: '_id',
        as: 'packagingData',
      },
    },
    {
      $addFields: {
        itemDetails: {
          $cond: {
            if: { $eq: ['$stockableItemType', 'ERPProduct'] },
            then: { $arrayElemAt: ['$productData', 0] },
            else: { $arrayElemAt: ['$packagingData', 0] },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'itemDetails.category',
        foreignField: '_id',
        as: 'categoryData',
      },
    },

    // D. Gruparea și calculul matematic istoric
    {
      $group: {
        _id: {
          item: '$stockableItem',
          location: '$effectiveLocation',
        },
        name: { $first: '$itemDetails.name' },
        code: { $first: '$itemDetails.productCode' },
        category: { $first: { $arrayElemAt: ['$categoryData.name', 0] } },
        unit: {
          $first: {
            $ifNull: ['$itemDetails.unit', '$itemDetails.packagingUnit'],
          },
        },
        type: { $first: '$stockableItemType' },
        location: { $first: '$effectiveLocation' },

        // Stocul la acea dată (Intrări - Ieșiri)
        totalQuantity: {
          $sum: {
            $cond: [
              { $in: ['$movementType', inTypesArray] },
              '$quantity',
              { $multiply: ['$quantity', -1] },
            ],
          },
        },

        // Valoarea contabilă a stocului la acea dată (Bani Intrați - Bani Ieșiți)
        totalValue: {
          $sum: {
            $cond: [
              { $in: ['$movementType', inTypesArray] },
              {
                $ifNull: [
                  '$lineCost',
                  { $multiply: ['$quantity', '$unitCost'] },
                ],
              },
              {
                $multiply: [
                  {
                    $ifNull: [
                      '$lineCost',
                      { $multiply: ['$quantity', '$unitCost'] },
                    ],
                  },
                  -1,
                ],
              },
            ],
          },
        },
      },
    },
  ]

  const rawResults = await StockMovementModel.aggregate(pipeline)

  // 5. Sortăm descrescător după Valoarea Totală
  const results = rawResults.sort((a, b) => {
    const valA = a.totalValue || 0
    const valB = b.totalValue || 0
    return valB - valA
  })

  let grandTotalValue = 0
  let countProducts = 0
  let countPackaging = 0

  // 6. Populam fișierul Excel
  results.forEach((item, index) => {
    // Evităm erorile de zecimale plutitoare din JS
    const qty = Number((item.totalQuantity || 0).toFixed(4))

    // Dacă la acea dată stocul produsului era zero, nu îl afișăm
    if (qty <= 0) return

    const totalValue = Number((item.totalValue || 0).toFixed(4))

    // Deducem prețul mediu istoric (Valoare / Cantitate)
    const avgPrice = totalValue / qty

    grandTotalValue += totalValue

    if (item.type === 'ERPProduct') countProducts++
    else countPackaging++

    const prettyLocation =
      LOCATION_NAMES_MAP[item.location as keyof typeof LOCATION_NAMES_MAP] ||
      item.location

    const categoryName = item.category || '-'

    const row = sheet.addRow({
      code: item.code || '-',
      name: item.name || 'Produs Necunoscut',
      category: categoryName,
      type: item.type === 'ERPProduct' ? 'Produs' : 'Ambalaj',
      location: prettyLocation,
      unit: item.unit || '-',
      qty: qty,
      avgPrice: avgPrice,
      totalValue: totalValue,
    })

    // Alternare culori pe rânduri
    if (index % 2 !== 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      }
    }

    // Borduri subțiri
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      }
    })
  })

  // 7. Formatare numere
  const numberColumns = ['qty', 'avgPrice', 'totalValue']
  numberColumns.forEach((key) => {
    sheet.getColumn(key).numFmt = '#,##0.00'
    sheet.getColumn(key).alignment = { horizontal: 'right' }
  })
  ;['unit', 'type', 'code'].forEach((key) => {
    sheet.getColumn(key).alignment = { horizontal: 'center' }
  })

  // 8. Footer cu Totaluri Generale
  sheet.addRow({})

  const totalRow = sheet.addRow({
    name: 'TOTAL GENERAL VALOARE',
    totalValue: grandTotalValue,
  })
  totalRow.font = { bold: true, size: 12 }
  totalRow.getCell('totalValue').numFmt = '#,##0.00'
  totalRow.getCell('totalValue').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE0B2' }, // Portocaliu deschis
  }

  sheet.addRow({})
  const statsHeader = sheet.addRow({ name: 'STATISTICI ARTICOLE' })
  statsHeader.font = { bold: true, underline: true }

  sheet.addRow({ name: 'Număr Produse (cu stoc):', qty: countProducts })
  sheet.addRow({ name: 'Număr Ambalaje (cu stoc):', qty: countPackaging })
  const totalStatsRow = sheet.addRow({
    name: 'Total Articole:',
    qty: countProducts + countPackaging,
  })
  totalStatsRow.font = { bold: true }
}
