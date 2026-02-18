'use server'

import { connectToDatabase } from '@/lib/db'
import PriceHistoryModel from './price-history.model'
import { Types } from 'mongoose'
import {
  IPriceHistoryEntry,
  IProductPriceHistory,
  PriceRecordParams,
} from './price-history.types'
import { StockMovementType } from '../inventory/constants'
import DeliveryNoteModel from '../financial/delivery-notes/delivery-note.model'
import PackagingModel from '../packaging-products/packaging.model'
import ERPProductModel from '../product/product.model'
import { calculateBaseUnitPrice } from '../product/product.actions'

// 1. INTRĂRI
export async function recordPurchasePrice(params: PriceRecordParams) {
  await connectToDatabase()
  const {
    stockableItem,
    stockableItemType,
    productSnapshot,
    partner,
    referenceId,
    date,
    unitMeasure,
    user,
    transactionType,
    priceDetails,
  } = params

  await PriceHistoryModel.findOneAndUpdate(
    { stockableItem: new Types.ObjectId(stockableItem) },
    {
      $setOnInsert: {
        stockableItemType,
        productName: productSnapshot.name,
        productCode: productSnapshot.code,
        baseUnit: productSnapshot.baseUnit,
      },
      $addToSet: {
        suppliers: {
          _id: new Types.ObjectId(partner._id),
          name: partner.name,
        },
      },
      $push: {
        purchases: {
          date,
          partner: {
            _id: new Types.ObjectId(partner._id),
            name: partner.name,
          },
          referenceId: new Types.ObjectId(referenceId),
          transactionType,
          unitMeasure,
          createdBy: {
            _id: new Types.ObjectId(user._id),
            name: user.name,
          },
          ...priceDetails,
        },
      },
    },
    { upsert: true, new: true },
  )
}

// 2. IEȘIRI
export async function recordSalePrice(params: PriceRecordParams) {
  await connectToDatabase()
  const {
    stockableItem,
    stockableItemType,
    productSnapshot,
    partner,
    referenceId,
    date,
    unitMeasure,
    user,
    transactionType,
    priceDetails,
  } = params

  await PriceHistoryModel.findOneAndUpdate(
    { stockableItem: new Types.ObjectId(stockableItem) },
    {
      $setOnInsert: {
        stockableItemType,
        productName: productSnapshot.name,
        productCode: productSnapshot.code,
        baseUnit: productSnapshot.baseUnit,
      },
      $push: {
        sales: {
          date,
          partner: {
            _id: new Types.ObjectId(partner._id),
            name: partner.name,
          },
          referenceId: new Types.ObjectId(referenceId),
          transactionType,
          unitMeasure,
          createdBy: {
            _id: new Types.ObjectId(user._id),
            name: user.name,
          },
          ...priceDetails,
        },
      },
    },
    { upsert: true, new: true },
  )
}

export async function removePriceHistoryByRef(referenceId: string) {
  await connectToDatabase()
  await PriceHistoryModel.updateMany(
    {
      $or: [
        { 'purchases.referenceId': new Types.ObjectId(referenceId) },
        { 'sales.referenceId': new Types.ObjectId(referenceId) },
      ],
    },
    {
      $pull: {
        purchases: { referenceId: new Types.ObjectId(referenceId) },
        sales: { referenceId: new Types.ObjectId(referenceId) },
      },
    },
  )
}

// --- WRAPPERS ---

export async function processReceptionForPriceHistory(reception: any) {
  await connectToDatabase()
  try {
    const allItems = [
      ...(reception.products || []),
      ...(reception.packagingItems || []),
    ]

    const transactionUser = {
      _id: reception.createdBy ? reception.createdBy.toString() : null,
      name: reception.createdByName || 'System',
    }

    for (const item of allItems) {
      if (item.product || item.packaging) {
        const itemId = item.product
          ? item.product.toString()
          : item.packaging.toString()
        const itemType = item.product ? 'ERPProduct' : 'Packaging'

        // Logica de preț din recepție (calculată anterior)
        const basePrice = item.invoicePricePerUnit

        if (!basePrice || basePrice <= 0) continue

        const baseUnitName = item.unitMeasure
        const vatRate = item.vatRate || 0

        await recordPurchasePrice({
          stockableItem: itemId,
          stockableItemType: itemType,
          productSnapshot: {
            name: item.productName || item.packagingName,
            code: item.productCode || item.packagingCode || 'N/A',
            baseUnit: baseUnitName,
          },
          partner: {
            _id: reception.supplier._id.toString(),
            name: reception.supplier.name,
          },
          referenceId: reception._id.toString(),
          date: reception.receptionDate || new Date(),

          // 👇 Folosim tipul real din Constants
          transactionType: 'RECEPTIE',

          unitMeasure: baseUnitName,
          user: transactionUser as any,
          priceDetails: {
            netPrice: basePrice,
            vatRate: vatRate,
            vatValue: (basePrice * vatRate) / 100,
            grossPrice: basePrice * (1 + vatRate / 100),
          },
        })
      }
    }
    console.log(
      `✅ [PriceHistory] Recepția ${reception.nirNumber || reception._id} procesată.`,
    )
  } catch (error) {
    console.error(`❌ [PriceHistory] Eroare procesare recepție:`, error)
  }
}

export async function processInvoiceForPriceHistory(invoice: any) {
  await connectToDatabase()

  try {
    const transactionUser = {
      _id: invoice.salesAgentId
        ? invoice.salesAgentId.toString()
        : invoice.approvedBy?.toString() || invoice.createdBy?.toString(),
      name:
        invoice.salesAgentSnapshot?.name ||
        invoice.approvedByName ||
        invoice.createdByName ||
        'System',
    }

    const sourceNoteIds = invoice.items
      .map((item: any) => item.sourceDeliveryNoteId)
      .filter((id: any) => id)
    const noteTypeMap = new Map<string, StockMovementType>()
    if (sourceNoteIds.length > 0) {
      const sourceNotes = await DeliveryNoteModel.find({
        _id: { $in: sourceNoteIds },
      })
        .select('_id deliveryType')
        .lean()
      sourceNotes.forEach((note: any) => {
        noteTypeMap.set(
          note._id.toString(),
          note.deliveryType as StockMovementType,
        )
      })
    }

    const productIds = invoice.items
      .filter(
        (item: any) =>
          (item.stockableItemType === 'ERPProduct' ||
            item.stockableItemType === 'Packaging') &&
          item.productId,
      )
      .map((item: any) => item.productId)

    const productMap = new Map<string, any>()

    if (productIds.length > 0) {
      const [products, packagings] = await Promise.all([
        ERPProductModel.find({ _id: { $in: productIds } })
          .select('unit packagingUnit packagingQuantity itemsPerPallet')
          .lean(),
        PackagingModel.find({ _id: { $in: productIds } })
          .select('packagingUnit')
          .lean(),
      ])

      products.forEach((p: any) => {
        // Stocăm datele folosind denumirile tale exacte din schema
        productMap.set(p._id.toString(), {
          unit: p.unit,
          packagingUnit: p.packagingUnit,
          packagingQuantity: p.packagingQuantity,
          itemsPerPallet: p.itemsPerPallet,
        })
      })

      packagings.forEach((p: any) => {
        productMap.set(p._id.toString(), {
          unit: p.packagingUnit || 'bucata',
          packagingUnit: null,
          packagingQuantity: 1,
          itemsPerPallet: 0,
        })
      })
    }

    for (const item of invoice.items) {
      if (
        (item.stockableItemType === 'ERPProduct' ||
          item.stockableItemType === 'Packaging') &&
        item.productId
      ) {
        let realTransactionType: StockMovementType | null = null
        if (invoice.invoiceType === 'STORNO') {
          realTransactionType = 'RETUR_CLIENT'
        } else if (item.sourceDeliveryNoteId) {
          realTransactionType =
            noteTypeMap.get(item.sourceDeliveryNoteId.toString()) || null
        }

        if (!realTransactionType) continue

        const productDef = productMap.get(item.productId.toString())
        if (!productDef) continue

        // 👇 AICI APELĂM FUNCȚIA SEPARATĂ DE CONVERSIE
        const finalBasePrice = await calculateBaseUnitPrice(
          productDef,
          item.unitOfMeasure,
          item.unitPrice,
        )

        if (finalBasePrice <= 0) continue

        const vatRate = item.vatRateDetails?.rate || 0
        await recordSalePrice({
          stockableItem: item.productId.toString(),
          stockableItemType: item.stockableItemType,
          productSnapshot: {
            name: item.productName,
            code: item.productCode || 'N/A',
            baseUnit: productDef.unit, // Folosim unitatea de bază din definiție
          },
          partner: {
            _id: invoice.clientId.toString(),
            name: invoice.clientSnapshot.name,
          },
          referenceId: invoice._id.toString(),
          date: invoice.invoiceDate || new Date(),
          transactionType: realTransactionType,
          unitMeasure: productDef.unit,
          user: transactionUser as any,
          priceDetails: {
            netPrice: finalBasePrice,
            vatRate: vatRate,
            vatValue: (finalBasePrice * vatRate) / 100,
            grossPrice: finalBasePrice * (1 + vatRate / 100),
          },
        })
      }
    }
  } catch (error) {
    console.error(`❌ [PriceHistory] Eroare factură:`, error)
  }
}

export async function getPriceHistory(params: {
  stockableItem: string
  partnerId?: string
  transactionType?: string
}): Promise<IProductPriceHistory> {
  await connectToDatabase()
  const { stockableItem, partnerId, transactionType } = params

  const doc = await PriceHistoryModel.findOne({
    stockableItem: new Types.ObjectId(stockableItem),
  }).lean()

  if (!doc) return { purchases: [], sales: [] }

  // Folosim const pentru a evita eroarea ESLint
  const purchases = (doc.purchases || []) as unknown as IPriceHistoryEntry[]
  let sales = (doc.sales || []) as unknown as IPriceHistoryEntry[]

  if (partnerId) {
    sales = sales.filter((s) => s.partner._id.toString() === partnerId)
  }
  if (transactionType) {
    sales = sales.filter((s) => s.transactionType === transactionType)
  }

  return {
    purchases: JSON.parse(JSON.stringify(purchases.reverse())),
    sales: JSON.parse(JSON.stringify(sales.reverse())),
  }
}
