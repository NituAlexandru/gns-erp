import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import StockMovementModel from '@/lib/db/modules/inventory/movement.model'
import {
  LOCATION_NAMES_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import '@/lib/db/modules/product/product.model'
import '@/lib/db/modules/packaging-products/packaging.model'
import '@/lib/db/modules/category/category.model'

// http://localhost:3000/api/dev/export-stoc-initial

export async function GET() {
  try {
    await connectToDatabase()

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Stoc Initial', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    // 1. Configurare Coloane
    sheet.columns = [
      { header: 'Cod', key: 'code', width: 10 },
      { header: 'Nume Produs / Ambalaj', key: 'name', width: 60 },
      { header: 'Tip', key: 'type', width: 10 },
      { header: 'Locație', key: 'location', width: 18 },

      { header: 'UM Bază', key: 'unit', width: 9 },
      { header: 'Cantitate Bază', key: 'qty', width: 18 },
      { header: 'Preț Bază', key: 'unitPrice', width: 14 },

      { header: 'UM 2 (Ambalaj)', key: 'um2', width: 17 },
      { header: 'Cantitate UM 2', key: 'qty2', width: 15 },
      { header: 'Preț UM 2', key: 'price2', width: 14 },

      { header: 'UM 3 (Palet)', key: 'um3', width: 17 },
      { header: 'Cantitate UM 3', key: 'qty3', width: 15 },
      { header: 'Preț UM 3', key: 'price3', width: 14 },

      { header: 'Valoare Totală', key: 'totalValue', width: 20 },
    ]

    // Stilizare Header
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF004080' },
    }
    headerRow.height = 25

    const inTypesArray = Array.from(IN_TYPES)

    // 2. Agregarea: Căutăm STOC_INITIAL + CORECTIE_OPERARE
    const pipeline: any[] = [
      {
        $match: {
          // AICI ESTE MODIFICAREA: Includem și corecțiile
          movementType: { $in: ['STOC_INITIAL', 'CORECTIE_OPERARE'] },
          status: { $ne: 'CANCELLED' },
        },
      },
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
      {
        $group: {
          _id: { item: '$stockableItem', location: '$effectiveLocation' },
          type: { $first: '$stockableItemType' },

          // Adunăm dacă e Intrare (Stoc Initial), Scădem dacă e Ieșire (Corectie)
          totalQuantity: {
            $sum: {
              $cond: [
                { $in: ['$movementType', inTypesArray] },
                '$quantity',
                { $multiply: ['$quantity', -1] },
              ],
            },
          },

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
      {
        $lookup: {
          from: 'erpproducts',
          localField: '_id.item',
          foreignField: '_id',
          as: 'productData',
        },
      },
      {
        $lookup: {
          from: 'packagings',
          localField: '_id.item',
          foreignField: '_id',
          as: 'packagingData',
        },
      },
      {
        $addFields: {
          itemDetails: {
            $cond: [
              { $eq: ['$type', 'ERPProduct'] },
              { $arrayElemAt: ['$productData', 0] },
              { $arrayElemAt: ['$packagingData', 0] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'packagings',
          localField: 'itemDetails.palletTypeId',
          foreignField: '_id',
          as: 'palletData',
        },
      },
    ]

    const rawResults = await StockMovementModel.aggregate(pipeline)

    // Sortăm descrescător după Valoarea Totală
    const results = rawResults.sort((a, b) => {
      const valA = a.totalValue || 0
      const valB = b.totalValue || 0
      return valB - valA
    })

    let grandTotalValue = 0

    // 3. Populam Excel-ul
    results.forEach((item, index) => {
      const qty = Number((item.totalQuantity || 0).toFixed(4))

      // Dacă în urma corecției stocul a ajuns la 0, nu îl mai listăm
      if (qty <= 0) return

      const totalValue = Number((item.totalValue || 0).toFixed(4))
      const unitPrice = totalValue / qty
      grandTotalValue += totalValue

      const prettyLoc =
        LOCATION_NAMES_MAP[
          item._id.location as keyof typeof LOCATION_NAMES_MAP
        ] || item._id.location

      const itemDetails = item.itemDetails || {}

      const pkgQty = itemDetails.packagingQuantity || 0
      const itemsPerPallet = itemDetails.itemsPerPallet || 0
      const palletName =
        item.palletData && item.palletData.length > 0
          ? item.palletData[0].name
          : 'Palet'

      const um2BaseEquivalent = pkgQty
      const um2 =
        um2BaseEquivalent > 0 && itemDetails.packagingUnit
          ? itemDetails.packagingUnit
          : '-'
      const qty2 = um2BaseEquivalent > 0 ? qty / um2BaseEquivalent : null
      const price2 =
        um2BaseEquivalent > 0 ? unitPrice * um2BaseEquivalent : null

      const um3BaseEquivalent =
        itemsPerPallet > 0
          ? pkgQty > 0
            ? itemsPerPallet * pkgQty
            : itemsPerPallet
          : 0

      const um3 = um3BaseEquivalent > 0 ? palletName : '-'
      const qty3 = um3BaseEquivalent > 0 ? qty / um3BaseEquivalent : null
      const price3 =
        um3BaseEquivalent > 0 ? unitPrice * um3BaseEquivalent : null

      const row = sheet.addRow({
        code: itemDetails.productCode || '-',
        name: itemDetails.name || 'Necunoscut',
        type: item.type === 'ERPProduct' ? 'Produs' : 'Ambalaj',
        location: prettyLoc,

        unit: itemDetails.unit || itemDetails.packagingUnit || '-',
        qty: qty,
        unitPrice: unitPrice,

        um2: um2,
        qty2: qty2 !== null ? qty2 : '',
        price2: price2 !== null ? price2 : '',

        um3: um3,
        qty3: qty3 !== null ? qty3 : '',
        price3: price3 !== null ? price3 : '',

        totalValue: totalValue,
      })

      if (index % 2 !== 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' },
        }
      }

      const highlightFill = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFE6F2FF' },
      }
      row.getCell('unit').fill = highlightFill
      row.getCell('um2').fill = highlightFill
      row.getCell('um3').fill = highlightFill

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        }
      })
    })

    const numCols = [
      'qty',
      'unitPrice',
      'qty2',
      'price2',
      'qty3',
      'price3',
      'totalValue',
    ]
    numCols.forEach((key) => {
      sheet.getColumn(key).numFmt = '#,##0.00'
      sheet.getColumn(key).alignment = { horizontal: 'right' }
    })
    ;['unit', 'type', 'code', 'um2', 'um3'].forEach((key) => {
      sheet.getColumn(key).alignment = { horizontal: 'center' }
    })

    sheet.addRow({})
    const totalRow = sheet.addRow({
      name: 'TOTAL VALOARE STOC INIȚIAL',
      totalValue: grandTotalValue,
    })
    totalRow.font = { bold: true, size: 12 }
    totalRow.getCell('totalValue').numFmt = '#,##0.00'

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Stoc_Initial.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Eroare API Stoc Initial:', error)
    return new NextResponse('Eroare la generarea raportului.', { status: 500 })
  }
}

// http://localhost:3000/api/dev/export-stoc-initial
