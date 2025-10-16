'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import { StockMovementInput, StockMovementSchema } from './validator'
import mongoose, {
  ClientSession,
  FilterQuery,
  startSession,
  Types,
} from 'mongoose'
import { IN_TYPES, OUT_TYPES } from './constants'
import {
  AggregatedStockItem,
  InventoryLocation,
  PackagingOption,
  ProductStockDetails,
  StockMovementDetails,
} from './types'
import '@/lib/db/modules/product/product.model'
import '@/lib/db/modules/user/user.model'
import '@/lib/db/modules/suppliers/supplier.model'
import '@/lib/db/modules/packaging-products/packaging.model'
import { MovementsFiltersState } from '@/app/admin/management/inventory/movements/movements-filters'
import ERPProductModel from '@/lib/db/modules/product/product.model'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import ReceptionModel from '@/lib/db/modules/reception/reception.model'
import { OrderLineItemInput } from '../order/types'

/**
 * Înregistrează o mișcare de stoc (IN/OUT) conform logicii FIFO.
 * Gestionează adăugarea și consumarea de loturi.
 * Câmpurile `locationTo` și `locationFrom` pot fi locații predefinite (ex: 'DEPOZIT')
 * sau ID-ul unui Proiect, pentru gestiunea stocurilor pe proiecte.
 * Această operație este tranzacțională.
 * @param input Detaliile mișcării de stoc.
 * @returns Documentul de mișcare de stoc creat.
 */

export async function recordStockMovement(
  input: StockMovementInput,
  existingSession?: ClientSession
) {
  const payload = StockMovementSchema.parse(input)

  const executeLogic = async (session: ClientSession) => {
    let isInput: boolean
    if (IN_TYPES.has(payload.movementType)) {
      isInput = true
    } else if (OUT_TYPES.has(payload.movementType)) {
      isInput = false
    } else {
      throw new Error(
        `Tipul de mișcare '${payload.movementType}' este necunoscut.`
      )
    }

    const auditLocation = isInput ? payload.locationTo : payload.locationFrom
    if (!auditLocation) {
      throw new Error('Locația (To/From) lipsește pentru acest tip de mișcare.')
    }

    let inventoryItem = await InventoryItemModel.findOne({
      stockableItem: payload.stockableItem,
      stockableItemType: payload.stockableItemType,
      location: auditLocation,
    }).session(session)

    if (!inventoryItem) {
      inventoryItem = new InventoryItemModel({
        stockableItem: payload.stockableItem,
        stockableItemType: payload.stockableItemType,
        location: auditLocation,
        batches: [],
      })
    }

    const balanceBefore = inventoryItem.batches.reduce(
      (sum, batch) => sum + batch.quantity,
      0
    )

    const movement = new StockMovementModel({
      ...payload,
      balanceBefore,
      balanceAfter: 0,
    })

    if (isInput) {
      if (payload.unitCost === undefined) {
        throw new Error(
          'Costul unitar este obligatoriu pentru mișcările de intrare.'
        )
      }
      inventoryItem.batches.push({
        quantity: payload.quantity,
        unitCost: payload.unitCost,
        entryDate: payload.timestamp ?? new Date(),
        movementId: movement._id as Types.ObjectId,
      })
      inventoryItem.batches.sort(
        (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
      )
    } else {
      // Logică de ieșire (FIFO)
      let quantityToDecrease = payload.quantity
      if (quantityToDecrease > balanceBefore) {
        throw new Error('Stoc insuficient.')
      }
      const newBatches = []
      for (const batch of inventoryItem.batches) {
        if (quantityToDecrease <= 0) {
          newBatches.push(batch)
          continue
        }
        if (batch.quantity > quantityToDecrease) {
          // Creăm un obiect nou cu proprietățile copiate manual
          newBatches.push({
            quantity: batch.quantity - quantityToDecrease,
            unitCost: batch.unitCost,
            entryDate: batch.entryDate,
            movementId: batch.movementId,
          })
          quantityToDecrease = 0
        } else {
          quantityToDecrease -= batch.quantity
        }
      }
      inventoryItem.batches = newBatches
    }

    await recalculateInventorySummary(inventoryItem)

    await inventoryItem.save({ session })

    const balanceAfter = inventoryItem.batches.reduce(
      (sum, batch) => sum + batch.quantity,
      0
    )
    movement.balanceAfter = balanceAfter

    await movement.save({ session })

    return movement
  }

  if (existingSession) {
    return executeLogic(existingSession)
  } else {
    const session = await startSession()
    try {
      let result
      await session.withTransaction(async (transactionSession) => {
        result = await executeLogic(transactionSession)
      })
      return result
    } finally {
      await session.endSession()
    }
  }
}

export async function reverseStockMovementsByReference(
  referenceId: string,
  session: ClientSession
) {
  const movementsToReverse = await StockMovementModel.find({
    referenceId,
    movementType: 'RECEPTIE',
    status: 'ACTIVE',
  }).session(session)

  if (movementsToReverse.length === 0) {
    console.warn(
      `[REVOC] Nu au fost găsite mișcări ACTIVE de tip RECEPTIE pentru referința ${referenceId}.`
    )
    return
  }

  for (const movement of movementsToReverse) {
    const movementIdStr = String(movement._id)

    const inventoryItem = await InventoryItemModel.findOne({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      location: movement.locationTo,
    }).session(session)

    let balanceBeforeReversal = 0
    let balanceAfterReversal = 0

    // Dacă inventarul nu mai există la locația respectivă (ex: consumat complet),
    // înregistrăm doar mișcarea de anulare ca audit și trecem mai departe.
    if (inventoryItem) {
      balanceBeforeReversal = inventoryItem.batches.reduce(
        (sum, b) => sum + b.quantity,
        0
      )

      const initialBatchCount = inventoryItem.batches.length

      // Încercăm să ștergem lotul corespunzător
      inventoryItem.batches = inventoryItem.batches.filter(
        (batch) => String(batch.movementId) !== movementIdStr
      )

      const removed = inventoryItem.batches.length < initialBatchCount

      if (removed) {
        await recalculateInventorySummary(inventoryItem)
        await inventoryItem.save({ session })
      } else {
        console.warn(
          `[REVOC] Lotul pentru mișcarea ${movementIdStr} nu a fost găsit în stoc (probabil consumat sau deja anulat).`
        )
      }

      balanceAfterReversal = inventoryItem.batches.reduce(
        (sum, b) => sum + b.quantity,
        0
      )
    } else {
      console.info(
        `[REVOC] Articolul de inventar pentru mișcarea ${movementIdStr} nu a fost găsit. Se înregistrează doar audit.`
      )
    }

    // Creăm mișcarea de audit de tip "ANULARE_RECEPTIE" pentru istoric
    const reversalMovement = new StockMovementModel({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      movementType: 'ANULARE_RECEPTIE',
      quantity: movement.quantity,
      unitMeasure: movement.unitMeasure,
      responsibleUser: movement.responsibleUser,
      locationFrom: movement.locationTo,
      referenceId,
      note: `Anulare mișcare recepție originală ${movementIdStr}`,
      timestamp: new Date(),
      balanceBefore: balanceBeforeReversal,
      balanceAfter: balanceAfterReversal,
    })
    await reversalMovement.save({ session })

    // PASUL 2: În loc să ștergem, ACTUALIZĂM statusul mișcării originale
    movement.status = 'CANCELLED'
    await movement.save({ session })
  }
}

export async function getInventoryLedger(
  stockableItemId: string,
  location?: string
) {
  await connectToDatabase()
  const filter: FilterQuery<IStockMovementDoc> = {
    stockableItem: stockableItemId,
  }
  if (location) {
    filter.$or = [{ locationFrom: location }, { locationTo: location }]
  }
  return StockMovementModel.find(filter).sort({ timestamp: 1 }).lean()
}

export async function getCurrentStock(
  stockableItemId: string,
  locations?: string[]
) {
  await connectToDatabase()
  const filter: FilterQuery<IInventoryItemDoc> = {
    stockableItem: stockableItemId,
  }
  if (locations && locations.length) {
    filter.location = { $in: locations }
  }
  const docs = await InventoryItemModel.find(filter).lean()

  const byLocation: Record<string, number> = {}
  let grandTotal = 0

  for (const doc of docs) {
    const locationTotal = doc.batches.reduce(
      (sum, batch) => sum + batch.quantity,
      0
    )
    byLocation[doc.location] = (byLocation[doc.location] || 0) + locationTotal
    grandTotal += locationTotal
  }

  return { byLocation, grandTotal }
}

const getPackagingOptionsPipeline = (): mongoose.PipelineStage[] => [
  {
    $lookup: {
      from: 'erpproducts',
      localField: '_id',
      foreignField: '_id',
      as: 'productDetails',
    },
  },
  { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'packagings',
      localField: 'productDetails.palletTypeId',
      foreignField: '_id',
      as: 'palletTypeDetails',
    },
  },
  { $unwind: { path: '$palletTypeDetails', preserveNullAndEmptyArrays: true } },

  // Construim dinamic array-ul de opțiuni de conversie
  {
    $addFields: {
      packagingOptions: {
        $concatArrays: [
          {
            $cond: {
              if: {
                $and: [
                  '$productDetails.packagingUnit',
                  '$productDetails.packagingQuantity',
                  { $gt: ['$productDetails.packagingQuantity', 0] },
                ],
              },
              then: [
                {
                  unitName: '$productDetails.packagingUnit',
                  baseUnitEquivalent: '$productDetails.packagingQuantity',
                },
              ],
              else: [],
            },
          },
          {
            $cond: {
              if: {
                $and: [
                  '$productDetails.itemsPerPallet',
                  { $gt: ['$productDetails.itemsPerPallet', 0] },
                ],
              },
              then: [
                {
                  unitName: { $ifNull: ['$palletTypeDetails.name', 'Palet'] },
                  baseUnitEquivalent: {
                    $ifNull: [
                      {
                        $multiply: [
                          '$productDetails.itemsPerPallet',
                          '$productDetails.packagingQuantity',
                        ],
                      },
                      '$productDetails.itemsPerPallet',
                    ],
                  },
                },
              ],
              else: [],
            },
          },
        ],
      },
    },
  },
]
const createPackagingOptionsPipelineForPackaging =
  (): mongoose.PipelineStage[] => {
    return [
      {
        $lookup: {
          from: 'packagings',
          localField: '_id',
          foreignField: '_id',
          as: 'packagingDetails',
        },
      },
      { $unwind: '$packagingDetails' },
      {
        $lookup: {
          from: 'packagings',
          localField: 'packagingDetails.palletTypeId',
          foreignField: '_id',
          as: 'palletTypeDetails',
        },
      },
      {
        $unwind: {
          path: '$palletTypeDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          packagingOptions: {
            $let: {
              vars: {
                palletUnitName: {
                  $ifNull: ['$palletTypeDetails.name', 'Palet'],
                },
              },
              in: {
                $cond: {
                  if: {
                    $and: [
                      '$packagingDetails.itemsPerPallet',
                      {
                        $ne: [
                          '$packagingDetails.packagingUnit',
                          '$$palletUnitName',
                        ],
                      },
                    ],
                  },
                  then: [
                    {
                      unitName: '$$palletUnitName',
                      baseUnitEquivalent: '$packagingDetails.itemsPerPallet',
                    },
                  ],
                  else: [],
                },
              },
            },
          },
        },
      },
    ]
  }

export async function getAggregatedStockStatus(
  query?: string
): Promise<AggregatedStockItem[]> {
  try {
    await connectToDatabase()

    const pipeline: mongoose.PipelineStage[] = [
      // Grupăm intrările din inventar pentru a însuma stocurile și a prelua prețurile pre-calculate
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$totalStock' },
          averageCost: { $avg: '$averageCost' },
          minPrice: { $min: '$minPurchasePrice' },
          maxPrice: { $max: '$maxPurchasePrice' },
          lastPrice: { $last: '$lastPurchasePrice' },
        },
      },
      //  Facem join cu produsele/ambalajele pentru a lua numele și detaliile de conversie
      {
        $lookup: {
          from: 'erpproducts',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      {
        $lookup: {
          from: 'packagings',
          localField: '_id',
          foreignField: '_id',
          as: 'packagingDetails',
        },
      },
      // Unwind pentru a putea accesa detaliile
      {
        $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: {
          path: '$packagingDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      // logica pentru a construi dinamic 'packagingOptions'
      {
        $lookup: {
          from: 'packagings',
          localField: 'productDetails.palletTypeId',
          foreignField: '_id',
          as: 'palletTypeDetails',
        },
      },
      {
        $unwind: {
          path: '$palletTypeDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          packagingOptions: {
            $concatArrays: [
              {
                $cond: {
                  // Condiția pentru 'packagingUnit' (ex: sac)
                  if: {
                    $and: [
                      '$productDetails.packagingUnit',
                      '$productDetails.packagingQuantity',
                      { $gt: ['$productDetails.packagingQuantity', 0] },
                    ],
                  },
                  then: [
                    {
                      unitName: '$productDetails.packagingUnit',
                      baseUnitEquivalent: '$productDetails.packagingQuantity',
                    },
                  ],
                  else: [],
                },
              },
              {
                $cond: {
                  // Condiția pentru 'palet'
                  if: {
                    $and: [
                      '$productDetails.itemsPerPallet',
                      { $gt: ['$productDetails.itemsPerPallet', 0] },
                    ],
                  },
                  then: [
                    {
                      unitName: {
                        $ifNull: ['$palletTypeDetails.name', 'Palet'],
                      },
                      baseUnitEquivalent: {
                        $multiply: [
                          '$productDetails.itemsPerPallet',
                          '$productDetails.packagingQuantity',
                        ],
                      },
                    },
                  ],
                  else: [],
                },
              },
            ],
          },
        },
      },

      // Proiectăm câmpurile finale, inclusiv 'packagingOptions' corect
      {
        $project: {
          _id: 1,
          totalStock: 1,
          averageCost: { $ifNull: ['$averageCost', 0] },
          minPrice: { $ifNull: ['$minPrice', 0] },
          maxPrice: { $ifNull: ['$maxPrice', 0] },
          lastPrice: { $ifNull: ['$lastPrice', 0] },
          name: { $ifNull: ['$productDetails.name', '$packagingDetails.name'] },
          unit: {
            $ifNull: [
              '$productDetails.unit',
              '$packagingDetails.packagingUnit',
            ],
          },
          productCode: {
            $ifNull: [
              '$productDetails.productCode',
              '$packagingDetails.productCode',
            ],
          },
          packagingOptions: 1,
        },
      },
    ]

    let combinedStock: AggregatedStockItem[] =
      await InventoryItemModel.aggregate(pipeline)

    // Logica de filtrare și sortare rămâne la fel
    if (query && query.trim() !== '') {
      const regex = new RegExp(query, 'i')
      combinedStock = combinedStock.filter(
        (item) =>
          (item.name && regex.test(item.name)) ||
          (item.productCode && regex.test(item.productCode))
      )
    }

    combinedStock = combinedStock.filter(
      (item) => item.name != null && item.totalStock !== 0
    )
    combinedStock.sort((a, b) => a.name.localeCompare(b.name))

    return JSON.parse(JSON.stringify(combinedStock))
  } catch (error) {
    console.error('Eroare la agregarea stocului:', error)
    return []
  }
}

export async function getStockByLocation(
  locationId: InventoryLocation,
  query?: string
): Promise<AggregatedStockItem[]> {
  try {
    await connectToDatabase()

    // ---------- PIPELINE pentru PRODUSE ----------
    const productPipeline: mongoose.PipelineStage[] = [
      { $match: { location: locationId, stockableItemType: 'ERPProduct' } },
      { $unwind: '$batches' },
      { $sort: { 'batches.entryDate': 1 } },
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$batches.quantity' },
          totalValue: {
            $sum: { $multiply: ['$batches.quantity', '$batches.unitCost'] },
          },
          minPrice: { $min: '$batches.unitCost' },
          maxPrice: { $max: '$batches.unitCost' },
          lastPrice: { $last: '$batches.unitCost' },
        },
      },
      ...getPackagingOptionsPipeline(), // (join în erpproducts + palet & opțiuni)
      {
        $project: {
          _id: 1,
          totalStock: 1,
          minPrice: { $ifNull: ['$minPrice', 0] },
          maxPrice: { $ifNull: ['$maxPrice', 0] },
          lastPrice: { $ifNull: ['$lastPrice', 0] },
          averageCost: {
            $ifNull: [{ $divide: ['$totalValue', '$totalStock'] }, 0],
          },
          name: '$productDetails.name',
          unit: '$productDetails.unit',
          productCode: '$productDetails.productCode',
          packagingOptions: 1,
        },
      },
    ]

    // ---------- PIPELINE pentru AMBALAJE ----------
    const packagingPipeline: mongoose.PipelineStage[] = [
      { $match: { location: locationId, stockableItemType: 'Packaging' } },
      { $unwind: '$batches' },
      { $sort: { 'batches.entryDate': 1 } },
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$batches.quantity' },
          totalValue: {
            $sum: { $multiply: ['$batches.quantity', '$batches.unitCost'] },
          },
          minPrice: { $min: '$batches.unitCost' },
          maxPrice: { $max: '$batches.unitCost' },
          lastPrice: { $last: '$batches.unitCost' },
        },
      },
      ...createPackagingOptionsPipelineForPackaging(), // (join în packagings + palet & opțiuni)
      {
        $project: {
          _id: 1,
          totalStock: 1,
          minPrice: { $ifNull: ['$minPrice', 0] },
          maxPrice: { $ifNull: ['$maxPrice', 0] },
          lastPrice: { $ifNull: ['$lastPrice', 0] },
          averageCost: {
            $ifNull: [{ $divide: ['$totalValue', '$totalStock'] }, 0],
          },
          name: '$packagingDetails.name',
          unit: '$packagingDetails.packagingUnit',
          productCode: '$packagingDetails.productCode',
          packagingOptions: 1,
        },
      },
    ]

    const [productStock, packagingStock] = await Promise.all([
      InventoryItemModel.aggregate(productPipeline),
      InventoryItemModel.aggregate(packagingPipeline),
    ])

    // ---------- Combinare + filtrare ----------
    let combined: AggregatedStockItem[] = [...productStock, ...packagingStock]

    if (query && query.trim() !== '') {
      const regex = new RegExp(query, 'i')
      combined = combined.filter(
        (i) =>
          (i.name && regex.test(i.name)) ||
          (i.productCode && regex.test(i.productCode))
      )
    }

    combined = combined.filter((i) => i.name != null && i.totalStock > 0)
    combined.sort((a, b) => a.name.localeCompare(b.name))

    return JSON.parse(JSON.stringify(combined))
  } catch (error) {
    console.error(
      `Eroare la agregarea stocului pentru locația ${locationId}:`,
      error
    )
    return []
  }
}
export async function getStockMovements(filters: MovementsFiltersState) {
  try {
    await connectToDatabase()

    const pipeline: mongoose.PipelineStage[] = []

    pipeline.push({
      $lookup: {
        from: 'erpproducts',
        localField: 'stockableItem',
        foreignField: '_id',
        as: 'erpProductDetails',
      },
    })
    pipeline.push({
      $unwind: { path: '$erpProductDetails', preserveNullAndEmptyArrays: true },
    })

    pipeline.push({
      $lookup: {
        from: 'packagings',
        localField: 'stockableItem',
        foreignField: '_id',
        as: 'packagingDetails',
      },
    })
    pipeline.push({
      $unwind: { path: '$packagingDetails', preserveNullAndEmptyArrays: true },
    })

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'responsibleUser',
        foreignField: '_id',
        as: 'responsibleUserDetails',
      },
    })
    pipeline.push({
      $unwind: {
        path: '$responsibleUserDetails',
        preserveNullAndEmptyArrays: true,
      },
    })

    const matchConditions: mongoose.FilterQuery<IStockMovementDoc>[] = []

    if (filters.dateRange?.from) {
      matchConditions.push({
        timestamp: {
          $gte: filters.dateRange.from,
          ...(filters.dateRange.to && { $lte: filters.dateRange.to }),
        },
      })
    }

    if (filters.q && filters.q.trim() !== '') {
      const regex = new RegExp(filters.q, 'i')
      matchConditions.push({
        $or: [
          { 'erpProductDetails.name': regex },
          { 'packagingDetails.name': regex },
          { note: regex },
        ],
      })
    }
    if (filters.location && filters.location !== 'ALL') {
      matchConditions.push({
        $or: [
          { locationFrom: filters.location },
          { locationTo: filters.location },
        ],
      })
    }
    if (filters.type && filters.type !== 'ALL') {
      matchConditions.push({ movementType: filters.type })
    }
    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } })
    }

    pipeline.push({ $sort: { timestamp: -1 } })

    pipeline.push({
      $project: {
        _id: 1,
        movementType: 1,
        quantity: 1,
        unitMeasure: 1,
        timestamp: 1,
        locationFrom: 1,
        locationTo: 1,
        note: 1,
        balanceBefore: 1,
        balanceAfter: 1,
        responsibleUser: {
          _id: '$responsibleUserDetails._id',
          name: '$responsibleUserDetails.name',
        },
        stockableItem: {
          _id: '$stockableItem',
          name: {
            $ifNull: ['$erpProductDetails.name', '$packagingDetails.name'],
          },
        },
      },
    })

    const movements = await StockMovementModel.aggregate(pipeline)
    return JSON.parse(JSON.stringify(movements))
  } catch (error) {
    console.error('Eroare la preluarea mișcărilor de stoc:', error)
    return []
  }
}

export async function getStockMovementDetails(
  movementId: string
): Promise<StockMovementDetails | null> {
  try {
    await connectToDatabase()

    const movement = await StockMovementModel.findById(movementId)
      .populate({ path: 'stockableItem', select: 'name productCode' })
      .populate({ path: 'responsibleUser', select: 'name' })
      .lean()

    if (!movement) {
      throw new Error('Mișcarea de stoc nu a fost găsită.')
    }

    let referenceDetails = null
    if (movement.movementType === 'RECEPTIE' && movement.referenceId) {
      referenceDetails = await ReceptionModel.findById(movement.referenceId)
        .populate({ path: 'supplier', select: 'name' })
        .populate({ path: 'createdBy', select: 'name' })
        .populate({ path: 'products.product' })
        .populate({ path: 'packagingItems.packaging' })
        .lean()
    }

    const result = {
      movement,
      reference: referenceDetails,
    }

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error('Eroare la preluarea detaliilor mișcării de stoc:', error)
    return null
  }
}

export async function getProductStockDetails(
  productId: string
): Promise<ProductStockDetails | null> {
  try {
    await connectToDatabase()

    const aggregationPipeline: mongoose.PipelineStage[] = [
      {
        $match: { _id: new mongoose.Types.ObjectId(productId) },
      },

      ...getPackagingOptionsPipeline(),
    ]

    const results = await ERPProductModel.aggregate(aggregationPipeline)

    if (results.length === 0) {
      const packagingDetails = await PackagingModel.findById(productId).lean()
      if (!packagingDetails) {
        throw new Error(`Articolul cu ID-ul ${productId} nu a fost găsit.`)
      }
      const inventoryEntries = await InventoryItemModel.find({
        stockableItem: productId,
      }).lean()
      return JSON.parse(
        JSON.stringify({
          ...packagingDetails,
          locations: inventoryEntries,
          packagingOptions: [],
        })
      )
    }

    const itemDetails = results[0]
    const inventoryEntries = await InventoryItemModel.find({
      stockableItem: productId,
    }).lean()

    for (const entry of inventoryEntries) {
      entry.batches.sort(
        (a, b) =>
          new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      )
    }

    const result = { ...itemDetails, locations: inventoryEntries }

    result.packagingOptions = result.packagingOptions.filter(
      (opt: PackagingOption) => opt && opt.unitName && opt.baseUnitEquivalent
    )

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error(
      'Eroare la preluarea detaliilor de stoc pentru produs:',
      error
    )
    return null
  }
}

export async function recalculateInventorySummary(item: IInventoryItemDoc) {
  if (!item) return

  const totalStock = item.batches.reduce(
    (sum, batch) => sum + batch.quantity,
    0
  )

  // Actualizăm întotdeauna stocul total, indiferent de valoare
  item.totalStock = totalStock

  // Actualizăm prețurile DOAR dacă există stoc.
  if (totalStock > 0) {
    let totalValue = 0
    let maxPrice = 0
    let minPrice = Infinity

    // Sortăm pentru a găsi corect ultimul preț
    item.batches.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime())

    for (const batch of item.batches) {
      totalValue += batch.quantity * batch.unitCost
      if (batch.unitCost > maxPrice) maxPrice = batch.unitCost
      if (batch.unitCost < minPrice) minPrice = batch.unitCost
    }

    // Setăm noile valori calculate direct pe document
    item.averageCost = totalValue / totalStock
    item.maxPurchasePrice = maxPrice
    item.minPurchasePrice = minPrice === Infinity ? 0 : minPrice
    item.lastPurchasePrice = item.batches[item.batches.length - 1].unitCost
  }
  // Dacă stocul este 0, nu se intră în acest bloc, iar prețurile vechi rămân nemodificate.
}

// Funcția recalculateInventorySummary: Ar fi bine să adăugăm o sortare a
//  batches după dată direct în interiorul ei. Asta garantează 100% că
// lastPurchasePrice este corect, indiferent de unde este apelată funcția.
// Este o mică îmbunătățire de siguranță.

// Funcțiile getAggregatedStockStatus și getStockByLocation: Aceste două
// funcții sunt acum ineficiente. Ele încă fac calculul complex ("numără
// cutiile manual") la fiecare apel. Acum că avem câmpurile de sumar
// pre-calculate pe InventoryItem, aceste funcții ar trebui simplificate
// radical pentru a citi direct acele sumare. Asta ar face pagina principală
// de inventar la fel de rapidă ca cea de produse.

/**
 * Rezervă stocul pentru o listă de articole dintr-o comandă.
 * Important: Această funcție este concepută să ruleze ÎN INTERIORUL unei tranzacții MongoDB
 * pentru a asigura integritatea datelor.
 * @param items - Liniile de comandă care conțin produse/ambalaje stocabile.
 * @param session - Sesiunea MongoDB activă pentru tranzacție.
 */
export async function reserveStock(
  items: OrderLineItemInput[],
  session: ClientSession
) {
  // Iterăm prin fiecare articol trimis din comandă
  for (const item of items) {
    // Ignorăm ce nu este un articol stocabil (servicii, linii manuale)
    if (!item.productId || item.isManualEntry) {
      continue // Trecem la următorul articol
    }

    // Calculăm cantitatea totală de rezervat în unitatea de bază a produsului.
    // Această logică este crucială pentru a gestiona corect comenzile în paleți, baxuri etc.
    let quantityToReserve = Number(item.quantity) || 0
    if (item.unitOfMeasure !== item.baseUnit) {
      const option = item.packagingOptions?.find(
        (opt: { unitName: string }) => opt.unitName === item.unitOfMeasure
      )
      if (option && option.baseUnitEquivalent) {
        quantityToReserve *= option.baseUnitEquivalent
      }
    }

    // Căutăm în inventar articolul corespunzător, doar în locația de bază
    const inventoryItem = await InventoryItemModel.findOne({
      stockableItem: item.productId,
      location: 'DEPOZIT', // Conform planului, rezervăm doar din depozitul principal
    }).session(session) // Asigurăm că această citire face parte din tranzacție

    // Dacă produsul nu are deloc stoc în depozit, aruncăm o eroare clară
    if (!inventoryItem) {
      throw new Error(
        `Stoc inexistent în depozit pentru produsul "${item.productName}".`
      )
    }

    // Verificăm dacă stocul DISPONIBIL este suficient
    const availableStock =
      inventoryItem.totalStock - inventoryItem.quantityReserved
    if (availableStock < quantityToReserve) {
      throw new Error(
        `Stoc insuficient pentru "${item.productName}". Disponibil: ${availableStock}, Necesar: ${quantityToReserve}.`
      )
    }

    // Dacă totul este în regulă, incrementăm cantitatea rezervată
    inventoryItem.quantityReserved += quantityToReserve

    // Salvăm documentul de inventar actualizat în cadrul aceleiași tranzacții
    await inventoryItem.save({ session })
  }
}

/**
 * Eliberează stocul rezervat (ex: la anularea unei comenzi confirmate).
 * O vom implementa complet când vom construi funcționalitatea de anulare.
 * @param items Liniile de comandă pentru care se eliberează stocul.
 * @param session Sesiunea MongoDB activă pentru tranzacție.
 */
// export async function unreserveStock(items: OrderLineItemInput[], session: ClientSession) {
//   // Logica va fi similară cu `reserveStock`, dar va scădea din `quantityReserved`.
//   // Pentru moment, o lăsăm ca placeholder.
//   console.log('Functia unreserveStock va fi implementata ulterior.');
// }
