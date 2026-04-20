'use server'

import ExcelJS from 'exceljs'
import ClientModel from '@/lib/db/modules/client/client.model'
import { PipelineStage } from 'mongoose'

export async function generateClientDetailsReport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  const pipeline: PipelineStage[] = []

  // 1. Aducem detaliile din ClientSummary (pentru Plafon și Status Blocare)
  pipeline.push({
    $lookup: {
      from: 'clientsummaries',
      localField: '_id',
      foreignField: 'clientId',
      as: 'summary',
    },
  })
  pipeline.push({
    $addFields: {
      summary: { $arrayElemAt: ['$summary', 0] },
    },
  })

  // 2. Aplicăm Filtrele Mongoose exact conform selecției din Modal
  const matchStage: any = {}

  if (filters.contractStatus === 'ACTIVE') {
    matchStage.contractNumber = { $nin: [null, ''] }
  } else if (filters.contractStatus === 'NONE') {
    matchStage.contractNumber = { $in: [null, ''] }
  }

  if (filters.creditLimitStatus === 'LIMITED') {
    matchStage['summary.creditLimit'] = { $gt: 0 }
  } else if (filters.creditLimitStatus === 'UNLIMITED') {
    matchStage['summary.creditLimit'] = { $not: { $gt: 0 } }
  }

  if (filters.lockingStatus === 'BLOCKED') {
    matchStage['summary.isBlocked'] = true
  } else if (filters.lockingStatus === 'ACTIVE') {
    matchStage['summary.isBlocked'] = { $ne: true }
  }

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage })
  }

  // Sortăm alfabetic
  pipeline.push({ $sort: { name: 1 } })

  const data = await ClientModel.aggregate(pipeline)

  // 3. Generăm Excel-ul
  const sheet = workbook.addWorksheet('Detalii Administrative', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Nume Client', key: 'name', width: 50 },
    { header: 'CUI / CNP', key: 'cui', width: 18 },
    { header: 'Telefon', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 45 },
    {
      header: 'Plafon Credit',
      key: 'creditLimit',
      width: 18,
      style: { alignment: { horizontal: 'center' } },
    },
    {
      header: 'Status Livrări',
      key: 'isBlocked',
      width: 18,
      style: { alignment: { horizontal: 'center' } },
    },
    {
      header: 'Nr. Contract',
      key: 'contractNumber',
      width: 18,
      style: { alignment: { horizontal: 'center' } },
    },
    {
      header: 'Dată Contract',
      key: 'contractDate',
      width: 15,
      style: { alignment: { horizontal: 'center' } },
    },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }, // Gri închis/Negru elegant
  }

  if (!data || data.length === 0) {
    sheet.addRow(['Nu s-au găsit clienți conform filtrelor.'])
    return
  }

  data.forEach((client) => {
    const isBlocked = client.summary?.isBlocked ? 'Blocat' : 'Activ'
    const limit =
      client.summary?.creditLimit > 0 ? client.summary.creditLimit : 'Nelimitat'

    let contractDateStr = '-'
    if (client.contractDate) {
      contractDateStr = new Date(client.contractDate).toLocaleDateString(
        'ro-RO',
      )
    }

    const row = sheet.addRow({
      name: client.name,
      cui: client.clientType === 'Persoana fizica' ? client.cnp : client.vatId,
      phone: client.phone || '-',
      email: client.email || '-',
      creditLimit: limit,
      isBlocked: isBlocked,
      contractNumber: client.contractNumber || 'Fără contract',
      contractDate: contractDateStr,
    })

    if (client.summary?.isBlocked) {
      row.getCell('isBlocked').font = {
        bold: true,
        color: { argb: 'FFEF4444' },
      }
    } else {
      row.getCell('isBlocked').font = { color: { argb: 'FF16A34A' } }
    }

    if (typeof limit === 'number') {
      row.getCell('creditLimit').numFmt = '#,##0.00'
    }
  })
}
