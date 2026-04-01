'use server'

import ExcelJS from 'exceljs'
import { getClientBalances } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { formatCurrency } from '@/lib/utils'
import {
  INVOICE_STATUS_MAP,
  InvoiceStatusKey,
} from '@/lib/db/modules/financial/invoices/invoice.constants'
import {
  CLIENT_PAYMENT_STATUS_MAP,
  ClientPaymentStatus,
} from '@/lib/db/modules/financial/treasury/receivables/client-payment.constants'
import { toZonedTime } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'
import { getNextBusinessDay, isBusinessDay } from '@/lib/deliveryDates'
import { addDays, startOfDay } from 'date-fns'

// Helper pentru a formata data frumos
const formatDate = (dateString: Date | string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export async function generateClientBalancesReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  const query = filters.q || ''

  const { data, summary } = await getClientBalances(query, {
    balanceType: filters.balanceType,
    minAmt: filters.minAmt,
    maxAmt: filters.maxAmt,
    overdueDays: filters.overdueDays,
    onlyOverdue: filters.onlyOverdue,
  })

  const sheet = workbook.addWorksheet('Solduri Clienți', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Coloanele cu DUBLU ROL (Client / Document)
  sheet.columns = [
    { header: 'Client / Document', key: 'col1', width: 45 },
    { header: 'Facturat / Status', key: 'col2', width: 22 },
    { header: 'Restante / Scadență', key: 'col3', width: 20 },
    { header: 'Nealocate / Status Zile', key: 'col4', width: 22 },
    { header: 'Compensări / Total Doc.', key: 'col5', width: 22 },
    { header: 'Sold Total / Rest Plată', key: 'col6', width: 20 },
    { header: '% Cotă Penalități', key: 'col7', width: 18 },
    { header: 'Suma Penalități / Penalizată', key: 'col8', width: 23 },
    { header: 'Urm. Facturare', key: 'col9', width: 18 },
  ]

  // Stilizare Header Principal
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

  // Iterăm prin Clienți
  data.forEach((client) => {
    // 1. RÂNDUL CLIENTULUI (Părinte)
    const mainRow = sheet.addRow({
      col1: client.clientName,
      col2: `${client.invoicesCount} factur${client.invoicesCount === 1 ? 'ă' : 'i'}`,
      col3:
        client.overdueCount > 0
          ? `(${client.overdueCount} restant${client.overdueCount === 1 ? 'ă' : 'e'})`
          : '',
      col4:
        client.paymentsCount > 0
          ? `(${client.paymentsCount} nealocat${client.paymentsCount === 1 ? 'ă' : 'e'})`
          : '',
      col5:
        client.compensationsCount > 0
          ? `(${client.compensationsCount} compensar${client.compensationsCount === 1 ? 'e' : 'i'})`
          : '',
      col6: client.totalBalance,
      col8:
        client.totalPenalties > 0
          ? client.totalPenalties < 100
            ? `${formatCurrency(client.totalPenalties)} (Așteaptă total min. 100,00 Lei)`
            : `${formatCurrency(client.totalPenalties)}`
          : '',
    })

    mainRow.font = { bold: true, size: 11 }
    // Fundal gri mai accentuat (ex: Slate 100) pentru a delimita clienții fără a folosi rânduri goale
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

    // Culori pentru contoarele clientului
    if (client.overdueCount > 0)
      mainRow.getCell('col3').font = { color: { argb: 'FFEF4444' }, bold: true }
    if (client.paymentsCount > 0)
      mainRow.getCell('col4').font = { color: { argb: 'FF10B981' }, bold: true }
    if (client.compensationsCount > 0)
      mainRow.getCell('col5').font = { color: { argb: 'FFF59E0B' }, bold: true }

    // Sold Client (Rosu pt Datorie, Verde pt Avans)
    const balanceCell = mainRow.getCell('col6')
    balanceCell.numFmt = '#,##0.00'
    balanceCell.alignment = { horizontal: 'right' }
    balanceCell.font = {
      bold: true,
      size: 11,
      color: { argb: client.totalBalance > 0 ? 'FFEF4444' : 'FF16A34A' },
    }

    if (client.totalPenalties > 0) {
      const clientPenaltyCell = mainRow.getCell('col8')
      clientPenaltyCell.font = { bold: true, color: { argb: 'FFEF4444' } }
      clientPenaltyCell.alignment = { horizontal: 'right' }
    }

    // 2. RÂNDURILE DE DETALII (Facturi/Plăți) - Dacă e bifat checkbox-ul
    if (filters.includeDetails && client.items && client.items.length > 0) {
      // Header micuț pentru detalii
      const detailHeaderRow = sheet.addRow({
        col1: '      ↳ DOCUMENT',
        col2: 'STATUS',
        col3: 'SCADENȚĂ',
        col4: 'STATUS / ZILE',
        col5: 'TOTAL FACTURĂ',
        col6: 'REST PLATĂ',
        col7: '% COTĂ',
        col8: 'PENALITATE',
        col9: 'URM. FACTURARE',
      })
      detailHeaderRow.font = {
        size: 9,
        bold: true,
        color: { argb: 'FF111827' },
      }
      detailHeaderRow.eachCell(
        (cell) =>
          (cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          }),
      )
      detailHeaderRow.getCell('col5').alignment = { horizontal: 'right' }
      detailHeaderRow.getCell('col6').alignment = { horizontal: 'right' }
      detailHeaderRow.getCell('col7').alignment = { horizontal: 'center' }
      detailHeaderRow.getCell('col8').alignment = { horizontal: 'right' }
      detailHeaderRow.getCell('col9').alignment = { horizontal: 'center' }

      // Adăugăm fiecare document
      client.items.forEach((item: any) => {
        const docName = item.seriesName
          ? `${item.seriesName} - ${item.documentNumber}`
          : item.documentNumber
        const docType = item.type === 'INVOICE' ? 'Factură' : 'Plată'

        // Preluăm numele user-friendly din constante
        let statusText = item.status
        if (item.type === 'INVOICE') {
          const mapped = INVOICE_STATUS_MAP[item.status as InvoiceStatusKey]
          if (mapped) statusText = mapped.name
        } else {
          const mapped =
            CLIENT_PAYMENT_STATUS_MAP[item.status as ClientPaymentStatus]
          if (mapped) statusText = mapped.name
        }

        const dueDateStr = item.dueDate ? formatDate(item.dueDate) : ''

        let statusZile = ''
        let statusZileColor = 'FF6B7280' // Gri default

        // Logica de status/zile (exact ca în interfață)
        if (item.type === 'INVOICE') {
          if (item.daysOverdue > 0) {
            statusZile = `${item.daysOverdue} zile`
            statusZileColor = 'FFEF4444' // Roșu
          } else {
            statusZile = 'În termen'
          }
        } else {
          statusZile = `${item.daysOverdue} zile nealocată`
          statusZileColor = 'FF10B981' // Verde
        }

        // --- LOGICA PENTRU URMĂTOAREA FACTURARE ---
        let nextBillingStr = ''
        let isNextBillingUrgent = false

        if (
          item.type === 'INVOICE' &&
          item.penaltyAmount > 0 &&
          item.nextBillingDate
        ) {
          if (client.totalPenalties < 100) {
            // CAZUL 1: Sub prag auto
            nextBillingStr = 'Sub prag auto'
            // Nu îl facem "urgent" (roșu) ca să nu panicheze utilizatorul
          } else {
            // CAZUL 2: Peste prag, calculăm ziua de execuție
            const nextDate = new Date(item.nextBillingDate)
            const now = new Date()

            if (nextDate <= now) {
              const romaniaTime = toZonedTime(now, TIMEZONE)
              const currentHour = romaniaTime.getHours()

              const runsToday = isBusinessDay(now) && currentHour < 18

              if (runsToday) {
                nextBillingStr = 'Azi, ora 18:00'
                isNextBillingUrgent = true
              } else {
                const nextRunDate = getNextBusinessDay(addDays(now, 1))
                const tomorrow = startOfDay(addDays(now, 1))

                if (startOfDay(nextRunDate).getTime() === tomorrow.getTime()) {
                  nextBillingStr = 'Mâine, ora 18:00'
                  isNextBillingUrgent = true
                } else {
                  const dayNames = [
                    'Duminică',
                    'Luni',
                    'Marți',
                    'Miercuri',
                    'Joi',
                    'Vineri',
                    'Sâmbătă',
                  ]
                  const dayName = dayNames[nextRunDate.getDay()]
                  nextBillingStr = `${dayName}, ora 18:00`
                  isNextBillingUrgent = true
                }
              }
            } else {
              nextBillingStr = formatDate(item.nextBillingDate)
            }
          }
        }

        const detailRow = sheet.addRow({
          col1: `      ${docName} (${docType} din ${formatDate(item.date)})`,
          col2: statusText,
          col3: dueDateStr,
          col4: statusZile,
          col5: item.type === 'INVOICE' ? item.grandTotal : -item.grandTotal, // Total factură
          col6:
            item.type === 'INVOICE'
              ? item.remainingAmount
              : -item.remainingAmount,
          col7:
            item.type === 'INVOICE' && item.penaltyAmount > 0
              ? `${item.appliedPercentage}%`
              : '',
          col8:
            item.type === 'INVOICE' && item.penaltyAmount > 0
              ? item.penaltyAmount
              : '',
          col9: nextBillingStr,
        })

        detailRow.font = { size: 10 }
        detailRow.eachCell(
          (cell) =>
            (cell.border = {
              bottom: { style: 'dotted', color: { argb: 'FFE5E7EB' } },
            }),
        )

        // Colorare Status Zile
        detailRow.getCell('col4').font = {
          color: { argb: statusZileColor },
          size: 10,
        }

        // Formatare Numerică
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
            argb:
              item.type === 'INVOICE' && item.remainingAmount > 0
                ? 'FFEF4444'
                : 'FF16A34A',
          },
        }
        const penaltyCell = detailRow.getCell('col8')
        if (item.penaltyAmount > 0) {
          penaltyCell.numFmt = '#,##0.00'
          penaltyCell.font = { color: { argb: 'FFEF4444' }, bold: true }
        }
        const nextBillingCell = detailRow.getCell('col9')
        if (isNextBillingUrgent) {
          nextBillingCell.font = { color: { argb: 'FFEF4444' }, bold: true }
        }
        penaltyCell.alignment = { horizontal: 'right' }
        detailRow.getCell('col7').alignment = { horizontal: 'center' }
        detailRow.getCell('col9').alignment = { horizontal: 'center' }
      })
    }
  })

  // --- ZONA DE SUMAR LA FINAL ---
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

  addSummaryRow('Clienți în listă:', data.length, false)
  addSummaryRow('Facturi Neachitate:', summary.totalUnpaidInvoices)
  addSummaryRow(
    'Avans Total Nealocat:',
    Math.abs(summary.totalUnallocatedAdvances),
  )
  addSummaryRow('SOLD TOTAL:', Math.abs(summary.totalNetBalance))
  addSummaryRow('Penalități Totale:', summary.totalPenalties)
}
