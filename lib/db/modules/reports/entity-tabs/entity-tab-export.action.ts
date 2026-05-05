'use server'

import ExcelJS from 'exceljs'
import { formatInTimeZone } from 'date-fns-tz'
import { TIMEZONE } from '@/lib/constants'
import { getOrdersForClient } from '@/lib/db/modules/order/client-order.actions'
import { getDeliveriesForClient } from '@/lib/db/modules/deliveries/client-delivery.actions'
import { getDeliveryNotesForClient } from '@/lib/db/modules/financial/delivery-notes/client-delivery-note.actions'
import { getInvoicesForClient } from '@/lib/db/modules/financial/invoices/client-invoice.actions'
import { getProductStatsForClient } from '@/lib/db/modules/client/summary/client-product-stats.actions'
import {
  getInvoicesForSupplier,
  getReceptionsForSupplier,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { getProductStatsForSupplier } from '@/lib/db/modules/suppliers/summary/supplier-product-stats.actions'
import { formatCurrency } from '@/lib/utils'
import { ORDER_STATUS_MAP } from '../../order/constants'
import { fetchAllPages } from './helper-for-all-pages'
import { DELIVERY_STATUS_MAP } from '../../deliveries/constants'
import { DELIVERY_NOTE_STATUS_MAP } from '../../financial/delivery-notes/delivery-note.constants'
import { INVOICE_STATUS_MAP } from '../../financial/invoices/invoice.constants'
import { LOCATION_NAMES_MAP } from '../../inventory/constants'
import { SUPPLIER_INVOICE_STATUS_MAP } from '../../financial/treasury/payables/supplier-invoice.constants'

const TAB_NAMES_RO: Record<string, string> = {
  orders: 'Comenzi',
  deliveries: 'Livrari',
  notices: 'Avize',
  invoices: 'Facturi',
  payments: 'Plati',
  products: 'Produse',
  receptions: 'Receptii',
}

const ENTITY_TYPE_RO: Record<string, string> = {
  CLIENT: 'Client',
  SUPPLIER: 'Furnizor',
}

const fNum = (num: any) => (typeof num === 'number' ? num : 0)
const fDate = (date: any) =>
  date ? formatInTimeZone(new Date(date), TIMEZONE, 'dd.MM.yyyy') : ''

export async function generateEntityTabExport(
  workbook: ExcelJS.Workbook,
  filters: any,
) {
  const { entityId, entityType, activeTab, fromDate, toDate, status } = filters

  const typeKey = String(entityType).toUpperCase()
  const tabKey = String(activeTab).toLowerCase()

  const typeRo =
    ENTITY_TYPE_RO[typeKey as keyof typeof ENTITY_TYPE_RO] || entityType
  const tabRo = TAB_NAMES_RO[tabKey as keyof typeof TAB_NAMES_RO] || activeTab

  const sheetName = `${typeRo} - ${tabRo}`.substring(0, 31)
  const sheet = workbook.addWorksheet(sheetName)

  // Cap de tabel înghețat
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

  if (entityType === 'CLIENT') {
    await handleClientExport(
      sheet,
      entityId,
      activeTab,
      fromDate,
      toDate,
      status,
    )
  } else if (entityType === 'SUPPLIER') {
    await handleSupplierExport(
      sheet,
      entityId,
      activeTab,
      fromDate,
      toDate,
      status,
    )
  }
}

async function handleClientExport(
  sheet: ExcelJS.Worksheet,
  clientId: string,
  activeTab: string,
  fromDate: string,
  toDate: string,
  status: string,
) {
  switch (activeTab) {
    case 'orders': {
      sheet.columns = [
        { header: 'Nr. Comandă', key: 'orderNumber', width: 20 },
        { header: 'Data Creării', key: 'date', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Agent Vânzări', key: 'agent', width: 25 },
        {
          header: 'Total',
          key: 'total',
          width: 20,
          style: { alignment: { horizontal: 'right' } },
        },
      ]

      // Stilizare Header
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      }

      const orders = await fetchAllPages((p) =>
        getOrdersForClient(clientId, p, fromDate, toDate),
      )

      let totalSum = 0

      orders.forEach((item: any, index: number) => {
        const rowTotal =
          typeof item.totals?.grandTotal === 'number'
            ? item.totals.grandTotal
            : 0
        totalSum += rowTotal

        const row = sheet.addRow({
          orderNumber: item.orderNumber,
          date: fDate(item.createdAt),
          status:
            ORDER_STATUS_MAP[item.status as keyof typeof ORDER_STATUS_MAP]
              ?.name || item.status,
          agent: item.salesAgentSnapshot?.name || 'N/A',
          total: formatCurrency(rowTotal),
        })

        // Zebra striping (rânduri alternate)
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          }
        }
      })

      // Rândul de TOTAL
      if (orders.length > 0) {
        const totalRow = sheet.addRow({
          orderNumber: 'TOTAL',
          date: '',
          status: '',
          agent: '',
          total: formatCurrency(totalSum),
        })

        totalRow.font = { bold: true }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        }
        totalRow.alignment = { horizontal: 'right' }
      }
      break
    }

    case 'deliveries': {
      sheet.columns = [
        { header: 'Nr. Livrare', key: 'deliveryNumber', width: 25 },
        { header: 'Dată Programată', key: 'requestedDeliveryDate', width: 15 },
        { header: 'Dată Livrare', key: 'deliveryDate', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Șofer / Vehicul', key: 'driverVehicle', width: 35 },
        {
          header: 'Total',
          key: 'total',
          width: 20,
          style: { alignment: { horizontal: 'right' } },
        },
      ]

      // Stilizare Header
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      }

      const deliveries = await fetchAllPages((p) =>
        getDeliveriesForClient(clientId, p, fromDate, toDate),
      )
      let totalSum = 0

      deliveries.forEach((item: any, index: number) => {
        const rowTotal =
          typeof item.totals?.grandTotal === 'number'
            ? item.totals.grandTotal
            : 0
        totalSum += rowTotal

        const driver = item.driverName || item.logisticsSnapshot?.driverName
        const vehicle =
          item.carNumber ||
          item.vehiclePlate ||
          item.logisticsSnapshot?.carNumber ||
          item.logisticsSnapshot?.vehiclePlate
        const driverVehicle =
          [driver, vehicle].filter(Boolean).join(' / ') || 'N/A'

        const statusName =
          DELIVERY_STATUS_MAP[item.status as keyof typeof DELIVERY_STATUS_MAP]
            ?.name || item.status

        const row = sheet.addRow({
          deliveryNumber: item.deliveryNumber,
          requestedDeliveryDate: fDate(item.requestedDeliveryDate),
          deliveryDate: fDate(item.deliveryDate),
          status: statusName,
          driverVehicle: driverVehicle,
          total: formatCurrency(rowTotal),
        })

        // Zebra striping (rânduri alternate)
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          }
        }
      })

      // Rândul de TOTAL
      if (deliveries.length > 0) {
        const totalRow = sheet.addRow({
          deliveryNumber: 'TOTAL',
          requestedDeliveryDate: '',
          deliveryDate: '',
          status: '',
          driverVehicle: '',
          total: formatCurrency(totalSum),
        })

        totalRow.font = { bold: true }
        totalRow.alignment = { horizontal: 'right' }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        }
      }
      break
    }

    case 'notices': {
      sheet.columns = [
        { header: 'Nr. Aviz', key: 'docNumber', width: 20 },
        { header: 'Data Creării', key: 'date', width: 15 },
        { header: 'Nr. Comandă', key: 'orderNumber', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        {
          header: 'Total',
          key: 'total',
          width: 20,
          style: { alignment: { horizontal: 'right' } },
        },
      ]

      // Stilizare Header
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      }

      const notices = await fetchAllPages((p) =>
        getDeliveryNotesForClient(clientId, p, fromDate, toDate),
      )
      let totalSum = 0

      notices.forEach((item: any, index: number) => {
        const rowTotal =
          typeof item.totals?.grandTotal === 'number'
            ? item.totals.grandTotal
            : 0
        totalSum += rowTotal

        const statusName =
          DELIVERY_NOTE_STATUS_MAP[
            item.status as keyof typeof DELIVERY_NOTE_STATUS_MAP
          ]?.name || item.status

        const row = sheet.addRow({
          docNumber: `${item.seriesName}-${item.noteNumber}`,
          date: fDate(item.createdAt),
          orderNumber: item.orderNumberSnapshot || '-',
          status: statusName,
          total: formatCurrency(rowTotal),
        })

        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          }
        }
      })

      // Rândul de TOTAL
      if (notices.length > 0) {
        const totalRow = sheet.addRow({
          docNumber: 'TOTAL',
          date: '',
          orderNumber: '',
          status: '',
          total: formatCurrency(totalSum),
        })

        totalRow.font = { bold: true }
        totalRow.alignment = { horizontal: 'right' }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        }
      }
      break
    }

    case 'invoices': {
      sheet.columns = [
        { header: 'Nr. Document', key: 'docNumber', width: 20 },
        { header: 'Tip', key: 'type', width: 15 },
        { header: 'Data Emiterii', key: 'invoiceDate', width: 15 },
        { header: 'Data Scadenței', key: 'dueDate', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        {
          header: 'Rest de Plată',
          key: 'remaining',
          width: 20,
          style: { alignment: { horizontal: 'right' } },
        },
        {
          header: 'Total',
          key: 'total',
          width: 20,
          style: { alignment: { horizontal: 'right' } },
        },
      ]

      // Stilizare Header
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      }

      const invoices = await fetchAllPages((p) =>
        getInvoicesForClient(clientId, p, status || 'ALL', fromDate, toDate),
      )
      let totalSum = 0
      let remainingSum = 0

      invoices.forEach((item: any, index: number) => {
        const rowTotal =
          typeof item.totals?.grandTotal === 'number'
            ? item.totals.grandTotal
            : 0
        const rowRemaining =
          typeof item.remainingAmount === 'number' ? item.remainingAmount : 0

        totalSum += rowTotal
        remainingSum += rowRemaining

        const statusName =
          INVOICE_STATUS_MAP[item.status as keyof typeof INVOICE_STATUS_MAP]
            ?.name || item.status
        const remainingText =
          rowRemaining > 0 ? formatCurrency(rowRemaining) : 'Achitat'

        const row = sheet.addRow({
          docNumber: `${item.seriesName}-${item.invoiceNumber}`,
          type: item.invoiceType,
          invoiceDate: fDate(item.invoiceDate),
          dueDate: fDate(item.dueDate),
          status: statusName,
          remaining: remainingText,
          total: formatCurrency(rowTotal),
        })

        // Stilizare text pentru "Rest de plată" (Roșu dacă e > 0, Verde pentru "Achitat")
        const remainingCell = row.getCell('remaining')
        if (rowRemaining > 0) {
          remainingCell.font = { color: { argb: 'FFDC2626' } } // text-red-600
        } else {
          remainingCell.font = { color: { argb: 'FF16A34A' } } // text-green-600
        }

        // Zebra striping (rânduri alternate)
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          }
        }
      })

      // Rândul de TOTAL
      if (invoices.length > 0) {
        const totalRow = sheet.addRow({
          docNumber: 'TOTAL',
          type: '',
          invoiceDate: '',
          dueDate: '',
          status: '',
          remaining: formatCurrency(remainingSum),
          total: formatCurrency(totalSum),
        })

        totalRow.font = { bold: true }
        totalRow.alignment = { horizontal: 'right' }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        }
      }
      break
    }

    case 'products': {
      sheet.columns = [
        { header: 'Nume Produs', key: 'name', width: 50 },
        { header: 'Tip', key: 'type', width: 15 },
        {
          header: 'Valoare Totală (fără TVA)',
          key: 'val',
          width: 30,
          style: { alignment: { horizontal: 'right' } },
        },
      ]

      // Stilizare Header
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      }

      // Funcție internă pentru traducerea tipului de produs (preluată din frontend)
      const formatItemType = (itemType: string): string => {
        switch (itemType) {
          case 'ERPProduct':
            return 'Produs'
          case 'Packaging':
            return 'Ambalaj'
          case 'Service':
            return 'Serviciu'
          case 'Manual':
            return 'Manual'
          default:
            return itemType || ''
        }
      }

      const products = await fetchAllPages((p) =>
        getProductStatsForClient(clientId, p, fromDate, toDate),
      )
      let totalSum = 0

      products.forEach((product: any, index: number) => {
        const rowTotal =
          typeof product.totalValue === 'number' ? product.totalValue : 0
        totalSum += rowTotal

        const row = sheet.addRow({
          name: product.productName,
          type: formatItemType(product.itemType),
          val: formatCurrency(rowTotal),
        })

        // Zebra striping (rânduri alternate)
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          }
        }
      })

      // Rândul de TOTAL
      if (products.length > 0) {
        const totalRow = sheet.addRow({
          name: 'TOTAL',
          type: '',
          val: formatCurrency(totalSum),
        })

        totalRow.font = { bold: true }
        totalRow.alignment = { horizontal: 'right' }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        }
      }
      break
    }
  }
}

async function handleSupplierExport(
  sheet: ExcelJS.Worksheet,
  supplierId: string,
  activeTab: string,
  fromDate: string,
  toDate: string,
  status: string,
) {
  switch (activeTab) {
    case 'receptions':
      {
        sheet.columns = [
          { header: 'Număr NIR', key: 'nir', width: 20 },
          { header: 'Data Recepției', key: 'date', width: 15 },
          { header: 'Factura Referință', key: 'invoice', width: 25 },
          { header: 'Gestiune', key: 'warehouse', width: 25 },
          {
            header: 'Valoare (RON)',
            key: 'total',
            width: 20,
            style: { alignment: { horizontal: 'right' } },
          },
        ]

        // Stilizare Header
        const headerRow = sheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' },
        }

        const receptions = await fetchAllPages((p) =>
          getReceptionsForSupplier(supplierId, p, fromDate, toDate),
        )
        let totalSum = 0

        receptions.forEach((item: any, index: number) => {
          const rowTotal =
            typeof item.totalValue === 'number' ? item.totalValue : 0
          totalSum += rowTotal

          const row = sheet.addRow({
            nir: `${item.series} - ${item.number}`.toUpperCase(),
            date: fDate(item.date),
            invoice: item.invoiceReference
              ? String(item.invoiceReference).toUpperCase()
              : '-',
            warehouse:
              LOCATION_NAMES_MAP[
                item.warehouseName as keyof typeof LOCATION_NAMES_MAP
              ] ||
              item.warehouseName ||
              '',
            total: formatCurrency(rowTotal),
          })

          // Zebra striping (rânduri alternate)
          if (index % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3F4F6' },
            }
          }
        })

        // Rândul de TOTAL
        if (receptions.length > 0) {
          const totalRow = sheet.addRow({
            nir: 'TOTAL',
            date: '',
            invoice: '',
            warehouse: '',
            total: formatCurrency(totalSum),
          })

          totalRow.font = { bold: true }
          totalRow.alignment = { horizontal: 'right' }
          totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' },
          }
        }
        break
      }

      sheet.columns = [
        { header: 'Serie și Număr', key: 'invoiceNumber', width: 20 },
        { header: 'Tip', key: 'type', width: 15 },
        { header: 'Data Emiterii', key: 'invoiceDate', width: 15 },
        { header: 'Data Scadenței', key: 'dueDate', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Total (RON)', key: 'total', width: 15 },
      ]
      const invoices = await fetchAllPages((p) =>
        getInvoicesForSupplier(supplierId, p, fromDate, toDate),
      )
      ;(invoices || []).forEach((inv: any) => {
        sheet.addRow({
          invoiceNumber: `${inv.invoiceSeries} ${inv.invoiceNumber}`,
          type: inv.invoiceType,
          invoiceDate: fDate(inv.invoiceDate),
          dueDate: fDate(inv.dueDate),
          status: inv.status,
          total: fNum(inv.totals?.grandTotal),
        })
      })
      break

    case 'invoices':
      {
        sheet.columns = [
          { header: 'Serie & Număr', key: 'invoiceNumber', width: 20 },
          { header: 'Tip Factură', key: 'type', width: 15 },
          { header: 'Data Facturii', key: 'invoiceDate', width: 15 },
          { header: 'Scadență', key: 'dueDate', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          {
            header: 'Total (RON)',
            key: 'total',
            width: 20,
            style: { alignment: { horizontal: 'right' } },
          },
        ]

        // Stilizare Header
        const headerRow = sheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' },
        }

        const invoices = await fetchAllPages((p) =>
          getInvoicesForSupplier(supplierId, p, fromDate, toDate),
        )
        let totalSum = 0

        invoices.forEach((item: any, index: number) => {
          const isStorno = item.invoiceType === 'STORNO'
          const baseTotal =
            typeof item.totals?.grandTotal === 'number'
              ? item.totals.grandTotal
              : 0

          // Dacă e STORNO, valoarea devine negativă (la fel ca în frontend)
          const rowTotal = isStorno ? -baseTotal : baseTotal
          totalSum += rowTotal

          // Preluăm numele curat al statusului
          const statusName =
            SUPPLIER_INVOICE_STATUS_MAP[
              item.status as keyof typeof SUPPLIER_INVOICE_STATUS_MAP
            ]?.name || item.status

          const row = sheet.addRow({
            invoiceNumber:
              `${item.invoiceSeries} - ${item.invoiceNumber}`.toUpperCase(),
            type: item.invoiceType || 'STANDARD',
            invoiceDate: fDate(item.invoiceDate),
            dueDate: fDate(item.dueDate),
            status: statusName,
            total: formatCurrency(rowTotal),
          })

          // Colorăm cu roșu dacă factura este STORNO
          if (isStorno) {
            row.getCell('type').font = { color: { argb: 'FFDC2626' } } // text-red-600
            row.getCell('total').font = { color: { argb: 'FFDC2626' } }
          }

          // Zebra striping (rânduri alternate)
          if (index % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3F4F6' },
            }
          }
        })

        // Rândul de TOTAL
        if (invoices.length > 0) {
          const totalRow = sheet.addRow({
            invoiceNumber: 'TOTAL',
            type: '',
            invoiceDate: '',
            dueDate: '',
            status: '',
            total: formatCurrency(totalSum),
          })

          totalRow.alignment = { horizontal: 'right' }
          totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' },
          }

          // Dacă suma totală e negativă per total, o facem roșie și îngroșată
          if (totalSum < 0) {
            totalRow.font = { bold: true, color: { argb: 'FFDC2626' } }
          } else {
            totalRow.font = { bold: true }
          }
        }
        break
      }

      sheet.columns = [
        { header: 'Nume Produs / Ambalaj', key: 'name', width: 40 },
        { header: 'Tip', key: 'type', width: 15 },
        { header: 'Valoare Achiziție (RON)', key: 'val', width: 25 },
      ]
      const products = await fetchAllPages((p) =>
        getProductStatsForSupplier(supplierId, p, fromDate, toDate),
      )
      ;(products || []).forEach((item: any) => {
        sheet.addRow({
          name: item.productName,
          type: item.itemType,
          val: fNum(item.totalValue),
        })
      })
      break

    case 'products': {
      sheet.columns = [
        { header: 'Nume Articol', key: 'name', width: 50 },
        { header: 'Tip', key: 'type', width: 15 },
        {
          header: 'Valoare Achiziție (RON)',
          key: 'val',
          width: 30,
          style: { alignment: { horizontal: 'right' } },
        },
      ]

      // Stilizare Header
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      }

      const products = await fetchAllPages((p) =>
        getProductStatsForSupplier(supplierId, p, fromDate, toDate),
      )
      let totalSum = 0

      products.forEach((product: any, index: number) => {
        const rowTotal =
          typeof product.totalValue === 'number' ? product.totalValue : 0
        totalSum += rowTotal

        const row = sheet.addRow({
          name: product.productName,
          type: product.itemType || '',
          val: formatCurrency(rowTotal),
        })

        // Zebra striping (rânduri alternate)
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          }
        }
      })

      // Rândul de TOTAL
      if (products.length > 0) {
        const totalRow = sheet.addRow({
          name: 'TOTAL',
          type: '',
          val: formatCurrency(totalSum),
        })

        totalRow.font = { bold: true }
        totalRow.alignment = { horizontal: 'right' }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        }
      }
      break
    }
  }
}
