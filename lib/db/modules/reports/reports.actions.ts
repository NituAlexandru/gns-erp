'use server'

import ExcelJS from 'exceljs'
import { connectToDatabase } from '@/lib/db'
import { generateInventoryValuation } from './inventory/inventory.actions'

// Definim tipul de răspuns standard
type GenerateReportResult = {
  success: boolean
  message?: string
  data?: string // Base64 string
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
        // Nume sugestiv: Valoare_Stoc_DEPOZIT_2024...
        const locLabel = filters.location === 'ALL' ? 'Total' : filters.location
        filename = `Valoare_Stoc_${locLabel}_${new Date().toISOString().split('T')[0]}.xlsx`
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
