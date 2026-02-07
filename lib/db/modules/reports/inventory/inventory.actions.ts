'use server'

import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import InventoryItemModel from '../../inventory/inventory.model'
import { LOCATION_NAMES_MAP } from '../../inventory/constants'
import '@/lib/db/modules/product/product.model'
import '@/lib/db/modules/packaging-products/packaging.model'
import '@/lib/db/modules/category/category.model'

export async function generateInventoryValuation(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  await connectToDatabase()

  const sheet = workbook.addWorksheet('Valoare Stoc', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // 1. Configurare Coloane (Ordinea nouă cerută)
  sheet.columns = [
    { header: 'Cod', key: 'code', width: 12 },
    { header: 'Nume Produs / Ambalaj', key: 'name', width: 80 },
    { header: 'Categorie', key: 'category', width: 25 },
    { header: 'Tip', key: 'type', width: 12 },
    { header: 'Locație', key: 'location', width: 15 },
    { header: 'UM', key: 'unit', width: 8 },
    { header: 'Stoc Total', key: 'qty', width: 12 },
    { header: 'Rezervat', key: 'reserved', width: 12 },
    { header: 'Disponibil', key: 'available', width: 12 },
    { header: 'Preț Mediu', key: 'avgPrice', width: 15 },
    { header: 'Ultimul Preț', key: 'lastPrice', width: 15 },
    { header: 'Preț Min', key: 'minPrice', width: 12 },
    { header: 'Preț Max', key: 'maxPrice', width: 12 },
    { header: 'Valoare Totală', key: 'totalValue', width: 18 },
  ]

  // 2. Stilizare Header (Gri închis cu text alb)
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F4F4F' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  // 3. Construire Query
  const query: any = {}

  if (!filters.includeZeroStock) {
    query.totalStock = { $ne: 0 }
  }

  if (filters.location && filters.location !== 'ALL') {
    query.location = filters.location
  }

  if (filters.itemType && filters.itemType !== 'ALL') {
    query.stockableItemType = filters.itemType
  }

  const rawItems = await InventoryItemModel.find(query)
    .populate({
      path: 'stockableItem',
      select: 'category',
      populate: {
        path: 'category',
        select: 'name',
      },
    })
    .lean()

  // Sortăm în memorie: Valoare Totală Descrescător (Mare -> Mic)
  const items = rawItems.sort((a, b) => {
    const valA = (a.totalStock || 0) * (a.averageCost || 0)
    const valB = (b.totalStock || 0) * (b.averageCost || 0)
    return valB - valA
  })

  let grandTotalValue = 0
  let countProducts = 0
  let countPackaging = 0

  // 4. Iterare și Adăugare Date
  items.forEach((item, index) => {
    const qty = item.totalStock || 0
    const reserved = item.quantityReserved || 0
    const available = qty - reserved
    const price = item.averageCost || 0
    const totalValue = qty * price

    if (totalValue > 0) grandTotalValue += totalValue

    if (item.stockableItemType === 'ERPProduct') countProducts++
    else countPackaging++

    const prettyLocation =
      LOCATION_NAMES_MAP[item.location as keyof typeof LOCATION_NAMES_MAP] ||
      item.location

    const categoryName = (item.stockableItem as any)?.category?.name || '-'

    const row = sheet.addRow({
      code: item.searchableCode || '-',
      name: item.searchableName || 'Produs Necunoscut',
      category: categoryName,
      type: item.stockableItemType === 'ERPProduct' ? 'Produs' : 'Ambalaj',
      location: prettyLocation,
      unit: item.unitMeasure || '-',
      qty: qty,
      reserved: reserved,
      available: available,
      avgPrice: price,
      lastPrice: item.lastPurchasePrice || 0,
      minPrice: item.minPurchasePrice || 0,
      maxPrice: item.maxPurchasePrice || 0,
      totalValue: totalValue,
    })

    if (index % 2 !== 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }, // Un gri foarte deschis
      }
    }

    // Borduri subțiri pentru fiecare celulă (arată mai bine tabelar)
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      }
    })
  })

  // 6. Formatare Coloane Numerice
  // Format: #,##0.00 (cu separator de mii și 2 zecimale)
  const numberColumns = [
    'qty',
    'reserved',
    'available',
    'avgPrice',
    'lastPrice',
    'minPrice',
    'maxPrice',
    'totalValue',
  ]
  numberColumns.forEach((key) => {
    sheet.getColumn(key).numFmt = '#,##0.00'
    sheet.getColumn(key).alignment = { horizontal: 'right' }
  })

  // Centrare coloane scurte
  ;['unit', 'type', 'code'].forEach((key) => {
    sheet.getColumn(key).alignment = { horizontal: 'center' }
  })

  // 7. ZONA DE TOTALURI (FOOTER)
  sheet.addRow({}) // Rând gol spacer

  // Total Valoare
  const totalRow = sheet.addRow({
    name: 'TOTAL GENERAL VALOARE',
    totalValue: grandTotalValue,
  })
  totalRow.font = { bold: true, size: 12 }
  totalRow.getCell('totalValue').numFmt = '#,##0.00'
  totalRow.getCell('totalValue').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE0B2' }, // Orange light
  }

  // Statistici Produse vs Ambalaje
  sheet.addRow({})
  const statsHeader = sheet.addRow({ name: 'STATISTICI ARTICOLE' })
  statsHeader.font = { bold: true, underline: true }

  sheet.addRow({ name: 'Număr Produse:', qty: countProducts })
  sheet.addRow({ name: 'Număr Ambalaje:', qty: countPackaging })
  const totalStatsRow = sheet.addRow({
    name: 'Total Articole:',
    qty: countProducts + countPackaging,
  })
  totalStatsRow.font = { bold: true }
}
