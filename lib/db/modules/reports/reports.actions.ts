'use server'

import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import { generateInventoryValuation } from './inventory/inventory.actions'
import { generateAgentSalesReport } from './sales/agent-sales.report.action'
import { generateInventoryHistory } from './inventory/inventory-history.actions'
import { generateProductMarginReport } from './sales/product-margin.report.action'
import { generateProductHistoryReport } from './inventory/product-history.report.action'
import { generateSalesPeriodReport } from './sales/sales-period.report.action'
import { generateClientBalancesReport } from './clients/client-balances.report.action'
import { generateSupplierBalancesReport } from './suppliers/supplier-balances.report.action'
import { generateClientDetailsReport } from './clients/client-details.report.action'
import { generatePenaltyRulesReport } from './clients/penalty-rules.report.action'
import { generateEntityTabExport } from './entity-tabs/entity-tab-export.action'

// Definim tipul de răspuns standard
type GenerateReportResult = {
  success: boolean
  message?: string
  data?: string
  filename?: string
}

export async function generateReportAction(
  reportId: string,
  filters: any,
): Promise<GenerateReportResult> {
  try {
    await connectToDatabase()

    // 1. Inițializăm un Workbook gol
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'GNS ERP'
    workbook.created = new Date()

    let filename = `Raport-${reportId}-${Date.now()}.xlsx`

    // 2. Rutăm cererea (Aici vom adăuga modulele pe viitor)
    switch (reportId) {
      case 'inventory-valuation':
        await generateInventoryValuation(workbook, filters)
        const locLabel = filters.location === 'ALL' ? 'Total' : filters.location
        filename = `Valoare_Stoc_${locLabel}_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case 'inventory-history':
        await generateInventoryHistory(workbook, filters)
        const dateStr = new Date(filters.targetDate).toISOString().split('T')[0]
        filename = `Istoric_Stoc_${dateStr}.xlsx`
        break

      case 'agent-sales-performance':
        await generateAgentSalesReport(workbook, filters)
        filename = `Vanzari_Agenti_${filters.startDate}_${filters.endDate}.xlsx`
        break

      case 'product-margins':
        await generateProductMarginReport(workbook, filters)
        filename = `Marje_Produse_${filters.startDate}_${filters.endDate}.xlsx`
        break

      case 'product-history':
        await generateProductHistoryReport(workbook, filters)
        const safeFileName = (filters.productName || 'Produs')
          .replace(/[\\/?*[\] ]/g, '_')
          .substring(0, 30)
        filename = `Fisa_Produs_${safeFileName}_${filters.startDate}_${filters.endDate}.xlsx`
        break

      case 'sales-period':
        await generateSalesPeriodReport(workbook, filters)
        filename = `Sumar_Vanzari_${filters.startDate}_${filters.endDate}.xlsx`
        break

      case 'client-balances':
        await generateClientBalancesReport(workbook, filters)
        filename = `Solduri_Clienti_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case 'client-administrative-details':
        await generateClientDetailsReport(workbook, filters)
        filename = `Detalii_Administrative_Clienti_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case 'penalty-rules-lists':
        await generatePenaltyRulesReport(workbook, filters)
        filename = `Liste_Penalitati_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case 'supplier-balances':
        await generateSupplierBalancesReport(workbook, filters)
        filename = `Solduri_Furnizori_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case 'entity-tab-export':
        await generateEntityTabExport(workbook, filters)
        filename = `Export_${filters.entityType}_${filters.activeTab}_${filters.fromDate}_${filters.toDate}.xlsx`
        break

      default:
        return {
          success: false,
          message: 'Logica pentru acest raport nu a fost implementată încă.',
        }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    return {
      success: true,
      data: base64,
      filename: filename,
    }
  } catch (error) {
    console.error('Eroare generare raport:', error)
    return {
      success: false,
      message: 'A apărut o eroare internă la generarea raportului.',
    }
  }
}
