'use server'

import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import { Types } from 'mongoose'
import { format } from 'date-fns'
import StockMovementModel from '../../inventory/movement.model'
import InvoiceModel from '../../financial/invoices/invoice.model'
import ERPProductModel from '../../product/product.model'
import PackagingModel from '../../packaging-products/packaging.model'
import { IN_TYPES, MOVEMENT_TYPE_DETAILS_MAP } from '../../inventory/constants'
import { formatCurrency3 } from '@/lib/utils'
import ReceptionModel from '../../reception/reception.model'

export async function generateProductHistoryReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  await connectToDatabase()

  const startDate = new Date(filters.startDate)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(filters.endDate)
  endDate.setHours(23, 59, 59, 999)

  const productId = new Types.ObjectId(filters.productId)

  // 1. Preluăm definițiile exacte ale produsului
  let baseUnit = 'buc'
  let packagingUnit = ''
  let packagingQuantity = 1
  let itemsPerPallet = 0

  if (filters.itemType === 'ERPProduct') {
    const product = await ERPProductModel.findById(productId).lean()
    if (product) {
      baseUnit = product.unit || 'buc'
      packagingUnit = product.packagingUnit || ''
      packagingQuantity = product.packagingQuantity || 1
      itemsPerPallet = (product as any).itemsPerPallet || 0
    }
  } else {
    const packaging = await PackagingModel.findById(productId).lean()
    if (packaging) {
      baseUnit = packaging.packagingUnit || 'buc'
      packagingUnit = packaging.packagingUnit || ''
    }
  }

  const hasPack = !!packagingUnit && packagingQuantity > 0
  const hasPallet = itemsPerPallet > 0
  const palletBaseEquivalent = hasPack
    ? itemsPerPallet * packagingQuantity
    : itemsPerPallet

  // Funcție de aflare a factorului de conversie spre Unitatea de Bază
  const calculateRowValues = (
    docQty: number,
    docUm: string,
    docPrice: number,
    invoicePackagingOptions: any[] = [],
  ) => {
    let factor = 1

    if (invoicePackagingOptions && invoicePackagingOptions.length > 0) {
      const opt = invoicePackagingOptions.find((o: any) => o.unitName === docUm)
      if (opt && opt.baseUnitEquivalent) factor = opt.baseUnitEquivalent
    }

    if (factor === 1) {
      const normDoc = docUm?.toLowerCase().trim()
      if (normDoc === packagingUnit.toLowerCase().trim() && hasPack) {
        factor = packagingQuantity
      } else if ((normDoc === 'palet' || normDoc === 'paleti') && hasPallet) {
        factor = palletBaseEquivalent
      }
    }

    const baseQty = docQty * factor
    const basePrice = factor > 0 ? docPrice / factor : docPrice

    return { baseQty, basePrice }
  }

  // 2. Extragem mișcările de stoc manuale (Fără TRANSFER_IN și Fără vânzări din facturi)
  const validInTypes = Array.from(IN_TYPES).filter(
    (t: string) => t !== 'TRANSFER_IN',
  )
  const validOutTypes = [
    'BON_DE_CONSUM',
    'RETUR_FURNIZOR',
    'PIERDERE',
    'DETERIORARE',
    'MINUS_INVENTAR',
    'CORECTIE_OPERARE',
  ]

  await ReceptionModel.init()

  const movements = await StockMovementModel.find({
    stockableItem: productId,
    movementType: { $in: [...validInTypes, ...validOutTypes] },
    timestamp: { $gte: startDate, $lte: endDate },
    status: 'ACTIVE',
  })
    .populate('supplierId', 'name')
    .populate('receptionRef', 'nirNumber')
    .lean()

  const historyLines: any[] = []

  for (const mov of movements) {
    const docUnit = mov.unitMeasure || baseUnit
    const vals = calculateRowValues(
      mov.quantity,
      docUnit,
      mov.unitCost || 0,
      [],
    )

    const isOut = validOutTypes.includes(mov.movementType)
    const sign = isOut ? -1 : 1

    const friendlyName =
      (MOVEMENT_TYPE_DETAILS_MAP as any)[mov.movementType]?.name ||
      mov.movementType

    let docName = 'Nu are NIR'
    const isMongoId = (val: any) => /^[a-f\d]{24}$/i.test(String(val))

    const formatNir = (rawNir: string) => {
      const str = String(rawNir).trim()
      if (str.toUpperCase().startsWith('NIR')) {
        return `NIR-${str.replace(/^NIR\s*-?\s*/i, '')}`
      }
      return str
    }

    if (mov.receptionRef && (mov.receptionRef as any).nirNumber) {
      docName = formatNir((mov.receptionRef as any).nirNumber)
    } else if (mov.documentNumber && !isMongoId(mov.documentNumber)) {
      docName = formatNir(mov.documentNumber)
    } else if (mov.supplierOrderNumber && !isMongoId(mov.supplierOrderNumber)) {
      docName = String(mov.supplierOrderNumber)
    } else if (mov.referenceId && !isMongoId(mov.referenceId)) {
      docName = String(mov.referenceId)
    }

    historyLines.push({
      date: mov.timestamp,
      operationType: isOut ? 'IEȘIRE' : 'INTRARE',
      documentType: friendlyName,
      documentNumber: docName,
      partner:
        (mov.supplierId as any)?.name || mov.supplierName || 'Ajustare Internă',

      docQty: mov.quantity * sign,
      docUm: docUnit,
      docPrice: mov.unitCost || 0,

      baseQty: vals.baseQty * sign,
      basePrice: vals.basePrice,
      totalValue: mov.quantity * (mov.unitCost || 0) * sign,
    })
  }

  // 3. Extragem IEȘIRILE (Vânzările) din Facturi
  const invoices = await InvoiceModel.aggregate([
    {
      $match: {
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['APPROVED', 'PAID', 'PARTIAL_PAID'] },
        invoiceType: { $ne: 'PROFORMA' },
      },
    },
    { $unwind: '$items' },
    { $match: { 'items.productId': productId } },
    {
      $project: {
        invoiceDate: 1,
        seriesName: 1,
        invoiceNumber: 1,
        invoiceType: 1,
        clientName: '$clientSnapshot.name',
        item: '$items',
      },
    },
  ])

  for (const inv of invoices) {
    const isStorno = inv.invoiceType === 'STORNO'
    const sign = isStorno ? 1 : -1 // Storno readuce în stoc (+), Factura vinde (-)
    const opType = isStorno ? 'INTRARE (Storno)' : 'IEȘIRE'

    const docQty = inv.item.quantity
    const docUm = inv.item.unitOfMeasure
    const docPrice = inv.item.unitPrice

    const vals = calculateRowValues(
      docQty,
      docUm,
      docPrice,
      inv.item.packagingOptions || [],
    )

    historyLines.push({
      date: inv.invoiceDate,
      operationType: opType,
      documentType: isStorno ? 'Factură Storno' : 'Factură Vânzare',
      documentNumber: `${inv.seriesName}-${inv.invoiceNumber}`,
      partner: inv.clientName,

      docQty: docQty * sign,
      docUm: docUm,
      docPrice: docPrice,

      baseQty: vals.baseQty * sign,
      basePrice: vals.basePrice,
      totalValue: (inv.item.lineValue || docQty * docPrice) * sign,
    })
  }

  // 4. Sortare Cronologică
  historyLines.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  if (historyLines.length === 0) {
    const sheet = workbook.addWorksheet('Fără Date')
    sheet.addRow([
      'Nu există mișcări sau facturi pentru acest produs în perioada selectată.',
    ])
    return
  }

  // 5. Construirea Excelului
  const safeName = filters.productName
    .replace(/[\\/?*[\]]/g, ' ')
    .substring(0, 30)
  const sheet = workbook.addWorksheet(safeName, {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  // Setăm structura coloanelor FĂRĂ proprietatea `header` pentru a controla perfect rândurile 1 și 2
  const columns: any[] = [
    { key: 'date', width: 13 },
    { key: 'operationType', width: 16 },
    { key: 'documentType', width: 22 },
    { key: 'documentNumber', width: 16 },
    { key: 'partner', width: 35 },
    { key: 'docQty', width: 12 },
    { key: 'docUm', width: 10 },
    { key: 'docPrice', width: 14 },
    { key: 'baseQty', width: 12 },
    { key: 'basePrice', width: 14 },
  ]
  if (hasPack) {
    columns.push({ key: 'packQty', width: 12 }, { key: 'packPrice', width: 14 })
  }
  if (hasPallet) {
    columns.push(
      { key: 'palletQty', width: 12 },
      { key: 'palletPrice', width: 14 },
    )
  }
  columns.push({ key: 'totalValue', width: 16 })
  sheet.columns = columns

  // Rândul 2 - Numele coloanelor
  const r2 = sheet.getRow(2)
  r2.getCell('docQty').value = 'Cantitate'
  r2.getCell('docUm').value = 'UM'
  r2.getCell('docPrice').value = 'Preț Unitar'
  r2.getCell('baseQty').value = `Cantitate`
  r2.getCell('basePrice').value = `Preț / ${baseUnit}`

  if (hasPack) {
    r2.getCell('packQty').value = `Cantitate`
    r2.getCell('packPrice').value = `Preț / ${packagingUnit}`
  }
  if (hasPallet) {
    r2.getCell('palletQty').value = `Cantitate`
    r2.getCell('palletPrice').value = `Preț / palet`
  }

  // Rândul 1 - Super Headers (Merge)
  sheet.getCell('A1').value = 'Data'
  sheet.getCell('B1').value = 'Tip Operațiune'
  sheet.getCell('C1').value = 'Tip Document'
  sheet.getCell('D1').value = 'Document'
  sheet.getCell('E1').value = 'Partener'

  sheet.mergeCells('A1:A2')
  sheet.mergeCells('B1:B2')
  sheet.mergeCells('C1:C2')
  sheet.mergeCells('D1:D2')
  sheet.mergeCells('E1:E2')

  const borderCols = ['partner', 'docPrice', 'basePrice']
  // Funcția pentru Super Headers care pune și bordere pe tot conturul blocului
  const setupHeaderGroup = (
    startKey: string,
    endKey: string,
    title: string,
    color: string,
  ) => {
    const startLetter = sheet.getColumn(startKey).letter
    const endLetter = sheet.getColumn(endKey).letter

    sheet.mergeCells(`${startLetter}1:${endLetter}1`)
    const cell1 = sheet.getCell(`${startLetter}1`)
    cell1.value = title
    cell1.alignment = { horizontal: 'center', vertical: 'middle' }
    cell1.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
  }

  setupHeaderGroup('docQty', 'docPrice', 'CONFORM DOCUMENT', 'FF0284C7') // Albastru
  setupHeaderGroup(
    'baseQty',
    'basePrice',
    `CONVERSIE: ${baseUnit.toUpperCase()}`,
    'FF059669',
  ) // Verde

  if (hasPack)
    setupHeaderGroup(
      'packQty',
      'packPrice',
      `CONVERSIE: ${packagingUnit.toUpperCase()}`,
      'FFD97706',
    ) // Portocaliu
  if (hasPallet)
    setupHeaderGroup('palletQty', 'palletPrice', 'CONVERSIE: PALET', 'FF7C3AED') // Violet

  const lastColLetter = sheet.getColumn('totalValue').letter
  sheet.mergeCells(`${lastColLetter}1:${lastColLetter}2`)
  sheet.getCell(`${lastColLetter}1`).value = 'Valoare Totală'

  // Stilizare globală headere
  ;[sheet.getRow(1), sheet.getRow(2)].forEach((row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    row.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // Aplicăm culoarea de fundal gri închis pentru restul capetelor de tabel
  ;['A1', 'B1', 'C1', 'D1', 'E1', `${lastColLetter}1`].forEach((cellRef) => {
    sheet.getCell(cellRef).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F4F4F' },
    }
  })

  // Gri puțin mai deschis pentru rândul 2 (Sub-headere cantitate/preț)
  const subHeaderCols = ['docQty', 'docUm', 'docPrice', 'baseQty', 'basePrice']
  if (hasPack) subHeaderCols.push('packQty', 'packPrice')
  if (hasPallet) subHeaderCols.push('palletQty', 'palletPrice')

  subHeaderCols.forEach((key) => {
    sheet.getCell(`${sheet.getColumn(key).letter}2`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' },
    }
  })
  sheet.getRow(2).height = 25

  if (hasPack) borderCols.push('packPrice')
  if (hasPallet) borderCols.push('palletPrice')
  borderCols.push('totalValue')

  // Aplicăm bordere PERFECTE pe tot capul de tabel (rândul 1 și 2) dintr-un singur foc
  columns.forEach((colDef, index) => {
    const colNumber = index + 1
    const cell1 = sheet.getCell(1, colNumber)
    const cell2 = sheet.getCell(2, colNumber)
    const isBorderCol = borderCols.includes(colDef.key)

    // Randul 1 primește mereu border SUS, plus dreapta unde e cazul
    cell1.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      ...(isBorderCol
        ? { right: { style: 'medium', color: { argb: 'FF000000' } } }
        : {}),
    }

    // Randul 2 primește mereu border JOS, plus dreapta unde e cazul
    cell2.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      ...(isBorderCol
        ? { right: { style: 'medium', color: { argb: 'FF000000' } } }
        : {}),
    }
  })

  // Aplicăm border pe capul de tabel (Rândurile 1 și 2)
  borderCols.forEach((key) => {
    const letter = sheet.getColumn(key).letter
    const cell1 = sheet.getCell(`${letter}1`)
    const cell2 = sheet.getCell(`${letter}2`)
    cell1.border = { right: { style: 'medium', color: { argb: 'FF000000' } } }
    cell2.border = { right: { style: 'medium', color: { argb: 'FF000000' } } }
  })

  // Variabile pentru TOTAL STOC
  let sumBaseQty = 0
  let sumTotalValue = 0

  let rowIndex = 2
  for (const line of historyLines) {
    rowIndex++

    // Adunăm la balanța finală de stoc (Intrările sunt deja +, Ieșirile -)
    sumBaseQty += line.baseQty
    sumTotalValue += line.totalValue

    const packQty = hasPack ? line.baseQty / packagingQuantity : 0
    const packPrice = hasPack ? line.basePrice * packagingQuantity : 0
    const palletQty = hasPallet ? line.baseQty / palletBaseEquivalent : 0
    const palletPrice = hasPallet ? line.basePrice * palletBaseEquivalent : 0

    const rowData: any = {
      date: format(new Date(line.date), 'dd.MM.yyyy'),
      operationType: line.operationType,
      documentType: line.documentType,
      documentNumber: line.documentNumber,
      partner: line.partner,

      docQty: line.docQty,
      docUm: line.docUm,
      docPrice: formatCurrency3(line.docPrice), // Aplicăm formatarea ta

      baseQty: line.baseQty,
      basePrice: formatCurrency3(line.basePrice), // Aplicăm formatarea ta

      totalValue: formatCurrency3(line.totalValue),
    }

    if (hasPack) {
      rowData.packQty = packQty
      rowData.packPrice = formatCurrency3(packPrice)
    }
    if (hasPallet) {
      rowData.palletQty = palletQty
      rowData.palletPrice = formatCurrency3(palletPrice)
    }

    const row = sheet.addRow(rowData)

    if (rowIndex % 2 !== 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F9FF' },
      }
    }

    const isOut = line.operationType === 'IEȘIRE'
    const color = isOut ? 'FFEF4444' : 'FF16A34A'

    row.getCell('operationType').font = { color: { argb: color }, bold: true }
    row.getCell('docQty').font = { color: { argb: color }, bold: true }
    row.getCell('baseQty').font = { color: { argb: color }, bold: true }
    if (hasPack)
      row.getCell('packQty').font = { color: { argb: color }, bold: true }
    if (hasPallet)
      row.getCell('palletQty').font = { color: { argb: color }, bold: true }

    // Setăm border-ul punctat jos și cel continuu/negru pe dreapta
    row.eachCell((cell, colNumber) => {
      const colKey = sheet.getColumn(colNumber).key as string
      const isBorderCol = borderCols.includes(colKey)

      cell.border = {
        bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } },
        ...(isBorderCol
          ? { right: { style: 'medium', color: { argb: 'FF000000' } } }
          : {}),
      }
      cell.alignment = { ...cell.alignment, vertical: 'middle' }
    })
  }
  const lastDataRow = sheet.getRow(rowIndex)
  lastDataRow.eachCell((cell, colNumber) => {
    const colKey = sheet.getColumn(colNumber).key as string
    const isBorderCol = borderCols.includes(colKey)

    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      ...(isBorderCol
        ? { right: { style: 'medium', color: { argb: 'FF000000' } } }
        : {}),
    }
  })

  // --- RÂNDUL DE TOTAL (BALANȚĂ STOC) ---
  sheet.addRow([]) // Spațiu
  const totalRowData: any = {
    partner: 'STOC CALCULAT (Intrări - Ieșiri):',
    baseQty: sumBaseQty, // DOAR Cantitatea Numerică
    basePrice: baseUnit, // UM-ul mutat pe coloana goală alăturată
    totalValue: formatCurrency3(sumTotalValue),
  }
  if (hasPack) {
    totalRowData.packQty = sumBaseQty / packagingQuantity
    totalRowData.packPrice = packagingUnit // UM-ul
  }
  if (hasPallet) {
    totalRowData.palletQty = sumBaseQty / palletBaseEquivalent
    totalRowData.palletPrice = 'paleti' // UM-ul
  }

  const totalRow = sheet.addRow(totalRowData)
  totalRow.height = 30
  totalRow.font = { bold: true, size: 12 }
  totalRow.getCell('partner').alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }

  const stocColor = sumBaseQty < 0 ? 'FFEF4444' : 'FF16A34A'

  // Formatăm separat celulele de cantitate (Bold și colorate)
  totalRow.getCell('baseQty').font = {
    bold: true,
    size: 12,
    color: { argb: stocColor },
  }
  totalRow.getCell('baseQty').alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }
  // Formatăm textul UM așezat vizual lângă cantitate
  totalRow.getCell('basePrice').font = {
    italic: true,
    size: 11,
    color: { argb: 'FF6B7280' },
  }
  totalRow.getCell('basePrice').alignment = {
    horizontal: 'left',
    vertical: 'middle',
  }

  if (hasPack) {
    totalRow.getCell('packQty').font = {
      bold: true,
      size: 12,
      color: { argb: stocColor },
    }
    totalRow.getCell('packQty').alignment = {
      horizontal: 'right',
      vertical: 'middle',
    }
    totalRow.getCell('packPrice').font = {
      italic: true,
      size: 11,
      color: { argb: 'FF6B7280' },
    }
    totalRow.getCell('packPrice').alignment = {
      horizontal: 'left',
      vertical: 'middle',
    }
  }
  if (hasPallet) {
    totalRow.getCell('palletQty').font = {
      bold: true,
      size: 12,
      color: { argb: stocColor },
    }
    totalRow.getCell('palletQty').alignment = {
      horizontal: 'right',
      vertical: 'middle',
    }
    totalRow.getCell('palletPrice').font = {
      italic: true,
      size: 11,
      color: { argb: 'FF6B7280' },
    }
    totalRow.getCell('palletPrice').alignment = {
      horizontal: 'left',
      vertical: 'middle',
    }
  }

  totalRow.getCell('totalValue').font = { bold: true, size: 12 }
  totalRow.getCell('totalValue').alignment = {
    horizontal: 'right',
    vertical: 'middle',
  }

  const leftBorderCols = ['baseQty', 'totalValue']
  if (hasPack) leftBorderCols.push('packQty')
  if (hasPallet) leftBorderCols.push('palletQty')

  // Trasăm borderul complet pentru rândul de total (Sus, Jos și Separatoarele laterale)
  totalRow.eachCell((cell, colNumber) => {
    const colKey = sheet.getColumn(colNumber).key as string
    const isRightBorder = borderCols.includes(colKey)
    const isLeftBorder = leftBorderCols.includes(colKey)
    const isPartner = colKey === 'partner'

    // Aplicăm bordere doar pe celulele care conțin date în rândul de total
    if (
      [
        'partner',
        'baseQty',
        'basePrice',
        'packQty',
        'packPrice',
        'palletQty',
        'palletPrice',
        'totalValue',
      ].includes(colKey)
    ) {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        ...(isRightBorder || isPartner
          ? { right: { style: 'medium', color: { argb: 'FF000000' } } }
          : {}),
        ...(isLeftBorder || isPartner
          ? { left: { style: 'medium', color: { argb: 'FF000000' } } }
          : {}),
      }
    }
  })

  // Formatare numere DOAR pentru cantități (prețurile sunt acum text "kg", "sac" etc)
  const numCols = ['docQty', 'baseQty']
  if (hasPack) numCols.push('packQty')
  if (hasPallet) numCols.push('palletQty')

  numCols.forEach((key) => {
    const col = sheet.getColumn(key)
    if (col) {
      col.numFmt = '#,##0.00'
      col.alignment = { horizontal: 'right', vertical: 'middle' }
    }
  })

  // Aliniem manual la dreapta coloanele de preț/valoare de pe RESTUL tabelului
  const priceCols = ['docPrice', 'basePrice', 'totalValue']
  if (hasPack) priceCols.push('packPrice')
  if (hasPallet) priceCols.push('palletPrice')

  priceCols.forEach((key) => {
    const col = sheet.getColumn(key)
    if (col) {
      col.alignment = { horizontal: 'right', vertical: 'middle' }
    }
  })

  sheet.getColumn('docUm').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }
  sheet.getColumn('date').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }
}
