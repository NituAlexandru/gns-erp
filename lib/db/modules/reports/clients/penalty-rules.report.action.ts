'use server'

import ExcelJS from 'exceljs'
import PenaltyRuleModel from '@/lib/db/modules/financial/penalties/penalty-rule.model'
import ClientModel from '@/lib/db/modules/client/client.model'

export async function generatePenaltyRulesReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  const ruleId = filters.ruleId

  // 1. Găsim regulile solicitate (Toate sau doar una)
  let rulesQuery: any = {}
  if (ruleId !== 'ALL') {
    rulesQuery = { _id: ruleId }
  }

  const rules = await PenaltyRuleModel.find(rulesQuery)
    .sort({ isDefault: -1 })
    .lean()

  // 2. Pentru a calcula clienții din regula Default, avem nevoie de toți clienții care sunt deja în liste Custom
  const allCustomRules = await PenaltyRuleModel.find({
    isDefault: false,
  }).lean()
  const allAssignedClientIds = allCustomRules.reduce((acc, rule) => {
    return acc.concat(rule.clientIds.map((id) => id.toString()))
  }, [] as string[])

  if (rules.length === 0) {
    const sheet = workbook.addWorksheet('Fara Date')
    sheet.addRow(['Nu s-au găsit liste de penalizare.'])
    return
  }

  // 3. Generăm câte un tab (Sheet) pentru fiecare regulă
  for (const rule of rules) {
    // Curățăm numele pentru a fi valid ca nume de tab Excel (max 31 caractere, fără simboluri)
    const safeName = (rule.name || 'Regula')
      .replace(/[\\/?*[\]]/g, '')
      .substring(0, 31)
    const sheet = workbook.addWorksheet(safeName)

    sheet.columns = [
      { header: 'Nume Client', key: 'name', width: 50 },
      { header: 'CUI / CNP', key: 'cui', width: 18 },
      { header: 'Telefon', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 40 },
      {
        header: 'Cotă Penalizare / Zi (%)',
        key: 'percentage',
        width: 22,
        style: { alignment: { horizontal: 'center' } },
      },
      {
        header: 'Emitere Auto (Zile)',
        key: 'autoBill',
        width: 20,
        style: { alignment: { horizontal: 'center' } },
      },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }, // Roșu pentru Penalități
    }

    // 4. Extragem clienții care aparțin acestei reguli
    let clientsQuery: any = {}
    if (rule.isDefault) {
      // Regula globală -> Toți clienții care NU sunt în allAssignedClientIds
      clientsQuery = { _id: { $nin: allAssignedClientIds } }
    } else {
      // Regula custom -> Doar clienții din rule.clientIds
      clientsQuery = { _id: { $in: rule.clientIds } }
    }

    const clients = await ClientModel.find(clientsQuery)
      .select('name vatId cnp phone email clientType')
      .sort({ name: 1 })
      .lean()

    if (clients.length === 0) {
      sheet.addRow(['Niciun client asignat acestei liste.'])
    } else {
      for (const client of clients) {
        sheet.addRow({
          name: client.name,
          cui:
            client.clientType === 'Persoana fizica' ? client.cnp : client.vatId,
          phone: client.phone || '-',
          email: client.email || '-',
          percentage: `${rule.percentagePerDay}%`,
          autoBill: rule.autoBillDays,
        })
      }
    }
  }
}
