'use server'

import ExcelJS from 'exceljs'
import { getSupplierBalances } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { formatCurrency } from '@/lib/utils'
import { SUPPLIER_INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import { SUPPLIER_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.constants'

const formatDate = (dateString: Date | string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export async function generateSupplierBalancesReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  const query = filters.q || ''

  const { data, summary } = await getSupplierBalances(query, {
    balanceType: filters.balanceType,
    minAmt: filters.minAmt,
    maxAmt: filters.maxAmt,
    overdueDays: filters.overdueDays,
    onlyOverdue: filters.onlyOverdue,
  })

  const sheet = workbook.addWorksheet('Solduri Furnizori', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Coloane specifice pentru furnizori (fără penalități)
  sheet.columns = [
    { header: 'Furnizor / Document', key: 'col1', width: 45 },
    { header: 'Facturat / Status', key: 'col2', width: 22 },
    { header: 'Restanțe / Scadență', key: 'col3', width: 20 },
    { header: 'Nealocate / Status Zile', key: 'col4', width: 22 },
    { header: 'Compensări / Total Doc.', key: 'col5', width: 22 },
    { header: 'Sold Total / Rest Plată', key: 'col6', width: 20 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2F4F4F' },
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 30

  if (!data || data.length === 0) {
    sheet.addRow(['Nu există date pentru filtrele selectate.'])
    return
  }

  data.forEach((supplier) => {
    // 1. RÂND PĂRINTE FURNIZOR
    const mainRow = sheet.addRow({
      col1: supplier.supplierName,
      col2: `${supplier.invoicesCount} factur${supplier.invoicesCount === 1 ? 'ă' : 'i'}`,
      col3:
        supplier.overdueCount > 0
          ? `(${supplier.overdueCount} restant${supplier.overdueCount === 1 ? 'ă' : 'e'})`
          : '',
      col4:
        supplier.paymentsCount > 0
          ? `(${supplier.paymentsCount} nealocat${supplier.paymentsCount === 1 ? 'ă' : 'e'})`
          : '',
      col5:
        supplier.compensationsCount > 0
          ? `(${supplier.compensationsCount} compensar${supplier.compensationsCount === 1 ? 'e' : 'i'})`
          : '',
      col6: supplier.totalBalance,
    })

    mainRow.font = { bold: true, size: 11 }
    mainRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    }
    mainRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      }
      cell.alignment = { vertical: 'middle' }
    })

    if (supplier.overdueCount > 0)
      mainRow.getCell('col3').font = { color: { argb: 'FFEF4444' }, bold: true }
    if (supplier.paymentsCount > 0)
      mainRow.getCell('col4').font = { color: { argb: 'FF10B981' }, bold: true }
    if (supplier.compensationsCount > 0)
      mainRow.getCell('col5').font = { color: { argb: 'FFF59E0B' }, bold: true }

    const balanceCell = mainRow.getCell('col6')
    balanceCell.numFmt = '#,##0.00'
    balanceCell.alignment = { horizontal: 'right' }
    balanceCell.font = {
      bold: true,
      size: 11,
      color: { argb: supplier.totalBalance > 0 ? 'FFEF4444' : 'FF16A34A' },
    }

    // 2. DETALII DOCUMENTE FURNIZOR
    if (filters.includeDetails && supplier.items && supplier.items.length > 0) {
      const detailHeaderRow = sheet.addRow({
        col1: '      ↳ DOCUMENT',
        col2: 'STATUS',
        col3: 'SCADENȚĂ',
        col4: 'STATUS / ZILE',
        col5: 'TOTAL FACTURĂ',
        col6: 'REST PLATĂ',
      })
      detailHeaderRow.font = {
        size: 9,
        bold: true,
        color: { argb: 'FF111827' },
      }
      detailHeaderRow.eachCell(
        (c) =>
          (c.border = {
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          }),
      )
      detailHeaderRow.getCell('col5').alignment = { horizontal: 'right' }
      detailHeaderRow.getCell('col6').alignment = { horizontal: 'right' }

      supplier.items.forEach((item: any) => {
        const docName = item.seriesName
          ? `${item.seriesName} - ${item.documentNumber}`
          : item.documentNumber
        const docType =
          item.type === 'INVOICE'
            ? item.invoiceType === 'STORNO'
              ? 'Storno'
              : 'Factură'
            : 'Plată'

        let statusText = item.status
        if (item.type === 'INVOICE') {
          statusText =
            SUPPLIER_INVOICE_STATUS_MAP[
              item.status as keyof typeof SUPPLIER_INVOICE_STATUS_MAP
            ]?.name || item.status
        } else {
          statusText =
            SUPPLIER_PAYMENT_STATUS_MAP[
              item.status as keyof typeof SUPPLIER_PAYMENT_STATUS_MAP
            ]?.name || item.status
        }

        let statusZile = ''
        let statusZileColor = 'FF6B7280'

        if (item.type === 'INVOICE') {
          if (item.daysOverdue > 0) {
            statusZile = `${item.daysOverdue} zile`
            statusZileColor = 'FFEF4444'
          } else {
            statusZile = 'În termen'
          }
        } else {
          statusZile = `${item.daysOverdue} zile nealocată`
          statusZileColor = 'FF10B981'
        }

        const detailRow = sheet.addRow({
          col1: `      ${docName} (${docType} din ${formatDate(item.date)})`,
          col2: statusText,
          col3: item.dueDate ? formatDate(item.dueDate) : '',
          col4: statusZile,
          col5: item.grandTotal,
          col6:
            item.type === 'INVOICE'
              ? item.mathematicalRemaining
              : -item.remainingAmount,
        })

        detailRow.font = { size: 10 }
        detailRow.eachCell(
          (c) =>
            (c.border = {
              bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } },
            }),
        )
        detailRow.getCell('col4').font = {
          color: { argb: statusZileColor },
          size: 10,
        }

        const totalCell = detailRow.getCell('col5')
        const restCell = detailRow.getCell('col6')
        totalCell.numFmt = '#,##0.00'
        totalCell.alignment = { horizontal: 'right' }
        totalCell.font = { color: { argb: 'FF6B7280' } }

        restCell.numFmt = '#,##0.00'
        restCell.alignment = { horizontal: 'right' }
        restCell.font = {
          bold: true,
          color: {
            argb: item.mathematicalRemaining > 0 ? 'FFEF4444' : 'FF16A34A',
          },
        }
      })
    }
  })

  // SUMAR FINAL
  sheet.addRow([])
  sheet.addRow([])
  const summaryHeaderRow = sheet.addRow(['', '', '', '', 'SUMAR RAPORT:'])
  summaryHeaderRow.font = { bold: true }

  const addSummaryRow = (label: string, value: number, isCurrency = true) => {
    const row = sheet.addRow([
      '',
      '',
      '',
      '',
      label,
      isCurrency ? formatCurrency(value) : value,
    ])
    row.getCell(5).alignment = { horizontal: 'right' }
    row.getCell(6).alignment = { horizontal: 'right' }
    row.getCell(6).font = { bold: true }
    return row
  }

  addSummaryRow('Furnizori în listă:', data.length, false)
  addSummaryRow('Facturi Neachitate:', summary.totalUnpaidInvoices)
  addSummaryRow(
    'Avans Total Nealocat:',
    Math.abs(summary.totalUnallocatedAdvances),
  )
  addSummaryRow('SOLD TOTAL:', Math.abs(summary.totalNetBalance))
}
