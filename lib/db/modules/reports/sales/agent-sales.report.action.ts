'use server'

import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import { getAgentSalesDetails } from '@/lib/db/modules/overview/agent-sales.actions'
import { format } from 'date-fns'

export async function generateAgentSalesReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  await connectToDatabase()

  // 1. Preluăm datele
  const response = await getAgentSalesDetails({
    startDate: new Date(filters.startDate),
    endDate: new Date(filters.endDate + 'T23:59:59'),
    includeDrafts: filters.includeDrafts,
    period: 'month',
  })

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Nu s-au putut prelua datele.')
  }

  const agentsData = response.data

  if (agentsData.length === 0) {
    const sheet = workbook.addWorksheet('Fără Date')
    sheet.addRow(['Nu există vânzări pentru perioada selectată.'])
    return
  }

  // =================================================================================
  // 1. GENERARE SHEET "SUMAR GENERAL" (DASHBOARD)
  // =================================================================================
  const summarySheet = workbook.addWorksheet('Sumar General', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Configurare Coloane Sumar
  summarySheet.columns = [
    { header: 'Agent Vânzări', key: 'agent', width: 35 },
    { header: 'Nr. Facturi', key: 'invCount', width: 15 },
    { header: 'Total Vânzări', key: 'revenue', width: 20 },
    { header: 'Total Cost Marfă', key: 'cost', width: 20 },
    { header: 'Profit Net', key: 'profit', width: 20 },
    { header: '% Marjă', key: 'margin', width: 15 },
  ]

  // Header Style Sumar
  const summaryHeader = summarySheet.getRow(1)
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  summaryHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' },
  }
  summaryHeader.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  }
  summaryHeader.height = 30

  // Variabile pentru Totalul FIRMEI
  let grandTotalRevenue = 0
  let grandTotalCost = 0
  let grandTotalProfit = 0
  let grandTotalInvoices = 0

  // Iterăm datele pentru a popula SUMARUL
  for (const agent of agentsData) {
    // Calculăm datele sigure
    const safeRevenue = agent.totalRevenue || 0
    const safeCost = agent.totalCost || 0
    const safeProfit = safeRevenue - safeCost
    const margin =
      safeRevenue !== 0
        ? ((safeProfit / safeRevenue) * 100).toFixed(1) + '%'
        : '0.0%'

    // Calculăm Nr. Facturi Unice (folosind Set pentru a elimina duplicatele liniilor)
    // Ne bazăm pe _id-ul facturii sau serie+număr
    const uniqueInvoiceIds = new Set()
    agent.lines.forEach((line: any) => {
      // Folosim ID-ul unic al facturii dacă există, altfel combinația serie-număr
      if (line._id) uniqueInvoiceIds.add(line._id.toString())
      else uniqueInvoiceIds.add(`${line.invoiceSeries}-${line.invoiceNumber}`)
    })
    const invoiceCount = uniqueInvoiceIds.size

    // Adăugăm la totalurile globale
    grandTotalRevenue += safeRevenue
    grandTotalCost += safeCost
    grandTotalProfit += safeProfit
    grandTotalInvoices += invoiceCount

    // Adăugăm rând în tabelul sumar
    const row = summarySheet.addRow({
      agent: agent.agentName || 'Necunoscut',
      invCount: invoiceCount,
      revenue: safeRevenue,
      cost: safeCost,
      profit: safeProfit,
      margin: margin,
    })

    // Stilizare Rând Sumar
    const profitColor = safeProfit >= 0 ? 'FF16A34A' : 'FFEF4444'
    row.getCell('revenue').font = { bold: true }
    row.getCell('profit').font = { bold: true, color: { argb: profitColor } }
    row.getCell('margin').font = { bold: true, color: { argb: profitColor } }

    // Borduri fine
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } } }
    })
  }

  // Formatare Numere Sumar
  ;['revenue', 'cost', 'profit'].forEach((key) => {
    summarySheet.getColumn(key).numFmt = '#,##0.00'
    summarySheet.getColumn(key).alignment = { horizontal: 'right' }
  })
  summarySheet.getColumn('invCount').alignment = { horizontal: 'center' }
  summarySheet.getColumn('margin').alignment = { horizontal: 'center' }

  // --- TOTAL GENERAL FIRMĂ (Footer Sumar) ---
  summarySheet.addRow([])
  const grandTotalRow = summarySheet.addRow({
    agent: 'TOTAL GENERAL FIRMĂ',
    invCount: grandTotalInvoices,
    revenue: grandTotalRevenue,
    cost: grandTotalCost,
    profit: grandTotalProfit,
    margin:
      grandTotalRevenue !== 0
        ? ((grandTotalProfit / grandTotalRevenue) * 100).toFixed(1) + '%'
        : '0.0%',
  })

  // Stil Grand Total
  grandTotalRow.height = 35
  grandTotalRow.font = { bold: true, size: 14 }
  grandTotalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  }

  // Culori specifice
  grandTotalRow.getCell('revenue').font = {
    color: { argb: 'FF000000' },
    bold: true,
    size: 12,
  }
  grandTotalRow.getCell('cost').font = {
    color: { argb: 'FFDC2626' },
    bold: true,
    size: 12,
  } // Roșu

  const grandProfitColor = grandTotalProfit >= 0 ? 'FF16A34A' : 'FFEF4444'
  grandTotalRow.getCell('profit').font = {
    color: { argb: grandProfitColor },
    bold: true,
    size: 13,
  }
  grandTotalRow.getCell('margin').font = {
    color: { argb: grandProfitColor },
    bold: true,
    size: 12,
  }

  // Borduri Grand Total
  grandTotalRow.eachCell((cell) => {
    cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' } }
  })

  // Legenda Costuri Estimate (Și pe pagina de sumar)
  summarySheet.addRow([])
  addEstimatedCostLegend(summarySheet)

  // =================================================================================
  // 2. GENERARE SHEET-URI INDIVIDUALE (DETALIATE)
  // =================================================================================
  for (const agent of agentsData) {
    const safeTotalRevenue = agent.totalRevenue || 0
    const safeTotalCost = agent.totalCost || 0
    const calculatedTotalProfit = safeTotalRevenue - safeTotalCost

    // Recalculăm nr facturi și pentru sheet-ul individual (pentru footer)
    const uniqueInvoiceIds = new Set()
    if (agent.lines) {
      agent.lines.forEach((line: any) => {
        if (line._id) uniqueInvoiceIds.add(line._id.toString())
        else uniqueInvoiceIds.add(`${line.invoiceSeries}-${line.invoiceNumber}`)
      })
    }
    const invoiceCount = uniqueInvoiceIds.size

    let safeSheetName = (agent.agentName || 'Agent')
      .replace(/[\\/?*[\]]/g, ' ')
      .substring(0, 30)

    let counter = 1
    while (workbook.getWorksheet(safeSheetName)) {
      safeSheetName = `${safeSheetName.substring(0, 25)}_${counter++}`
    }

    const sheet = workbook.addWorksheet(safeSheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    // Configurare Coloane
    sheet.columns = [
      { header: 'Tip', key: 'type', width: 10 },
      { header: 'Serie / Număr', key: 'series', width: 16 },
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Client', key: 'client', width: 40 },
      { header: 'Cod Produs', key: 'code', width: 14 },
      { header: 'Nume Produs', key: 'product', width: 70 },
      { header: 'UM', key: 'um', width: 8 },
      { header: 'Cantitate', key: 'qty', width: 12 },
      { header: 'Cost Unit.', key: 'unitCost', width: 15 },
      { header: 'Preț Unit.', key: 'unitPrice', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 },
      { header: '% Profit', key: 'margin', width: 12 },
    ]

    // Stilizare Header
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
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
    headerRow.height = 25

    // Populare Date Linii
    if (agent.lines && agent.lines.length > 0) {
      for (const line of agent.lines) {
        const isStorno = line.invoiceType === 'STORNO'

        const margin = isStorno
          ? '-'
          : line.lineValue !== 0
            ? ((line.lineProfit / line.lineValue) * 100).toFixed(1) + '%'
            : '0%'

        const unitCostDisplay =
          line.quantity !== 0 ? Math.abs(line.costUsed / line.quantity) : 0

        const row = sheet.addRow({
          type: isStorno ? 'STORNO' : 'FACT',
          series: `${line.invoiceSeries} - ${line.invoiceNumber}`,
          date: format(new Date(line.invoiceDate), 'dd.MM.yyyy'),
          client: line.clientName,
          code: line.productCode || '-',
          product: line.productName,
          um: line.unitOfMeasure || 'buc',
          qty: line.quantity,
          unitCost: unitCostDisplay,
          unitPrice: line.unitPrice,
          total: line.lineValue,
          profit: line.lineProfit,
          margin: margin,
        })

        // Culori
        if (isStorno) {
          row.getCell('type').font = { color: { argb: 'FFF97316' }, bold: true }
          row.getCell('series').font = { color: { argb: 'FFF97316' } }
        } else {
          row.getCell('type').font = { color: { argb: 'FF60A5FA' }, bold: true }
        }

        const isNegative = line.lineValue < 0 || isStorno
        const color = isNegative ? 'FFEF4444' : 'FF16A34A'

        row.getCell('total').font = { color: { argb: color }, bold: isStorno }
        row.getCell('profit').font = { color: { argb: color }, bold: true }
        row.getCell('margin').font = { color: { argb: color }, bold: true }

        if (line.isFallback) {
          row.getCell('unitCost').font = {
            color: { argb: 'FFF59E0B' },
            italic: true,
          }
        }

        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } },
          }
        })
      }
    }

    // Formatare numere
    const numCols = ['qty', 'unitCost', 'unitPrice', 'total', 'profit']
    numCols.forEach((key) => {
      sheet.getColumn(key).numFmt = '#,##0.00'
      sheet.getColumn(key).alignment = { horizontal: 'right' }
    })
    sheet.getColumn('margin').alignment = { horizontal: 'right' }
    sheet.getColumn('um').alignment = { horizontal: 'center' }
    sheet.getColumn('type').alignment = { horizontal: 'center' }
    sheet.getColumn('date').alignment = { horizontal: 'center' }

    // --- FOOTER INDIVIDUAL ---
    sheet.addRow([])

    // 1. TOTAL VENITURI
    const revenueRow = sheet.addRow({
      client: 'TOTAL VENITURI (Vânzări):',
      total: safeTotalRevenue,
    })
    revenueRow.font = { bold: true }
    revenueRow.getCell('client').alignment = { horizontal: 'right' }
    revenueRow.getCell('total').numFmt = '#,##0.00'
    revenueRow.getCell('total').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    }

    // 2. TOTAL COSTURI
    const costRow = sheet.addRow({
      client: 'TOTAL COST MARFĂ:',
      total: safeTotalCost,
    })
    costRow.font = { bold: true, color: { argb: 'FFDC2626' } }
    costRow.getCell('client').alignment = { horizontal: 'right' }
    costRow.getCell('total').numFmt = '#,##0.00'

    // 3. PROFIT NET
    const profitRow = sheet.addRow({
      client: 'PROFIT NET GENERAT:',
      total: calculatedTotalProfit,
    })
    const profitColor = calculatedTotalProfit >= 0 ? 'FF16A34A' : 'FFEF4444'
    const profitBg = calculatedTotalProfit >= 0 ? 'FFDCFCE7' : 'FFFEE2E2'

    profitRow.font = { bold: true, size: 12, color: { argb: profitColor } }
    profitRow.getCell('client').alignment = { horizontal: 'right' }
    profitRow.getCell('total').numFmt = '#,##0.00'
    profitRow.getCell('total').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: profitBg },
    }
    profitRow.getCell('total').border = {
      top: { style: 'double', color: { argb: 'FF000000' } },
    }

    // 4. NUMĂR FACTURI (NOU)
    sheet.addRow([])
    const countRow = sheet.addRow({
      client: 'Număr total facturi procesate:',
      code: invoiceCount + ' facturi',
    })
    countRow.font = { italic: true }
    countRow.getCell('client').alignment = { horizontal: 'right' }

    // Legendă
    sheet.addRow([])
    addEstimatedCostLegend(sheet)
  }
}

// Funcție Helper pentru a adăuga legenda la final de sheet
function addEstimatedCostLegend(sheet: ExcelJS.Worksheet) {
  const noteRow = sheet.addRow([
    '* NOTĂ: Valorile marcate cu portocaliu (italic) la "Cost Unit." reprezintă costuri ESTIMATE. ' +
      'Acestea apar atunci când nu există intrări de stoc cu preț valid pentru produsul respectiv, ' +
      'fiind utilizat prețul maxim de achiziție istoric.',
  ])

  // Încercăm să dăm merge pe primele 8 coloane (sau cât e nevoie)
  try {
    sheet.mergeCells(`A${noteRow.number}:H${noteRow.number}`)
  } catch (e) {
    // fallback in caz de eroare la merge
  }

  noteRow.getCell(1).font = {
    italic: true,
    size: 12,
    color: { argb: 'FF555555' },
  }
  noteRow.getCell(1).alignment = { wrapText: true, vertical: 'top' }
  noteRow.height = 30
}
