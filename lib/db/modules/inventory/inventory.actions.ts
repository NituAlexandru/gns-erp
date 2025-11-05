'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, {
  IInventoryBatch,
  IInventoryItemDoc,
} from './inventory.model'
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
  FifoCostInfo,
  ICostBreakdownBatch,
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
import { IOrderLineItem } from '../order/types'
import StockReservationModel from './reservation.model'
import User from '@/lib/db/modules/user/user.model'

/**
 * Înregistrează o mișcare de stoc (IN/OUT) conform logicii FIFO.
 * Gestionează adăugarea și consumarea de loturi.
 * Câmpurile `locationTo` și `locationFrom` pot fi locații predefinite (ex: 'DEPOZIT')
 * sau ID-ul unui Proiect, pentru gestiunea stocurilor pe proiecte.
 * Această operație este tranzacțională.
 *
 * 🔽 --- MODIFICARE: Returnează acum un obiect complex --- 🔽
 * @returns {Promise<{ movement: IStockMovementDoc, costInfo: FifoCostInfo | null }>}
 * Documentul de mișcare creat și (dacă e ieșire) costul FIFO calculat.
 */

export async function recordStockMovement(
  input: StockMovementInput,
  existingSession?: ClientSession
): Promise<{ movement: IStockMovementDoc; costInfo: FifoCostInfo | null }> {
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
        totalStock: 0, // Inițializăm corect
        quantityReserved: 0,
      })
    }

    // ==================================================================
    // 🔽 CORECȚIE BUG 1: Citim 'balanceBefore' din sumar, NU din 'batches'
    // ==================================================================
    const balanceBefore = inventoryItem.totalStock || 0
    let balanceAfter = balanceBefore // Inițializăm

    let responsibleUserName = 'Sistem'
    if (payload.responsibleUser) {
      const user = await User.findById(payload.responsibleUser)
        .select('name')
        .session(session)
        .lean()
      if (user) {
        responsibleUserName = user.name
      }
    }

    const movement = new StockMovementModel({
      ...payload,
      responsibleUser: payload.responsibleUser
        ? new Types.ObjectId(payload.responsibleUser)
        : undefined,
      responsibleUserName: responsibleUserName,
      balanceBefore,
      balanceAfter: 0, // Se setează la final
    })

    let costInfo: FifoCostInfo | null = null

    if (isInput) {
      // ==============================================================
      // ➡️ LOGICĂ DE INTRARE
      // ==============================================================
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

      movement.unitCost = payload.unitCost
      movement.lineCost = payload.quantity * payload.unitCost

      // Actualizăm sumarul manual
      balanceAfter = balanceBefore + payload.quantity
      inventoryItem.totalStock = balanceAfter
      inventoryItem.lastPurchasePrice = payload.unitCost // Actualizăm ultimul preț!
    } else {
      // ==============================================================
      // ➡️ LOGICĂ DE IEȘIRE
      // ==============================================================
      let quantityToDecrease = payload.quantity

      // 1. "Fotografiem" costul de fallback
      const fallbackCost = inventoryItem.lastPurchasePrice || 0

      // Inițializăm variabilele
      const newBatches: IInventoryBatch[] = []
      const costBreakdown: ICostBreakdownBatch[] = []
      let lineCostFIFO = 0

      // 2. Consumăm stocul existent (FIFO)
      for (const batch of inventoryItem.batches) {
        if (quantityToDecrease <= 0) {
          newBatches.push(batch)
          continue
        }

        const consumedQuantity = Math.min(batch.quantity, quantityToDecrease)

        const costOfThisPortion = consumedQuantity * batch.unitCost
        lineCostFIFO += costOfThisPortion

        costBreakdown.push({
          movementId: batch.movementId,
          entryDate: batch.entryDate,
          quantity: consumedQuantity,
          unitCost: batch.unitCost,
          type: 'REAL', // (Necesită modificarea schemei)
        })

        if (batch.quantity > consumedQuantity) {
          newBatches.push({
            quantity: batch.quantity - consumedQuantity,
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

      // 3. Verificăm dacă am intrat pe stoc negativ
      if (quantityToDecrease > 0) {
        const negativeStockCost = quantityToDecrease * fallbackCost
        lineCostFIFO += negativeStockCost

        costBreakdown.push({
          // movementId este opțional
          entryDate: new Date(),
          quantity: quantityToDecrease,
          unitCost: fallbackCost,
          type: 'PROVISIONAL', // (Necesită modificarea schemei)
        })
      }

      // 4. Calculăm costul unitar final
      const unitCostFIFO =
        payload.quantity > 0 ? lineCostFIFO / payload.quantity : 0

      // 5. Salvăm pe mișcare și pregătim returnul
      movement.unitCost = unitCostFIFO
      movement.lineCost = lineCostFIFO
      movement.costBreakdown = costBreakdown

      costInfo = {
        unitCostFIFO,
        lineCostFIFO,
        costBreakdown,
      }

      // 6. Actualizăm sumarul manual
      balanceAfter = balanceBefore - payload.quantity
      inventoryItem.totalStock = balanceAfter
    } // <-- Sfârșitul blocului 'else' (logica de ieșire)

    // ==================================================================
    // 🔽 CORECȚIE BUG 2: Chemăm funcția de sumar REPARATĂ
    // ==================================================================
    await recalculateInventorySummary(inventoryItem) // Acum e sigur

    await inventoryItem.save({ session })

    // ==================================================================
    // 🔽 CORECȚIE BUG 3: Setăm 'balanceAfter' corect
    // ==================================================================
    movement.balanceAfter = balanceAfter // Folosim valoarea calculată

    await movement.save({ session })

    return { movement, costInfo }
  } // <-- Sfârșitul 'executeLogic'

  // --- Logica de gestionare a sesiunii (NESCHIMBATĂ) ---
  if (existingSession) {
    return executeLogic(existingSession)
  } else {
    const session = await startSession()
    try {
      let result:
        | {
            movement: IStockMovementDoc
            costInfo: FifoCostInfo | null
          }
        | undefined

      await session.withTransaction(async (transactionSession) => {
        result = await executeLogic(transactionSession)
      })

      if (!result) {
        throw new Error('Tranzacția nu a returnat un rezultat.')
      }
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
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$totalStock' },
          totalReserved: { $sum: '$quantityReserved' },
          averageCost: { $avg: '$averageCost' },
          minPrice: { $min: '$minPurchasePrice' },
          maxPrice: { $max: '$maxPurchasePrice' },
          lastPrice: { $last: '$lastPurchasePrice' },
        },
      },
      // Lookup-uri pentru detalii produs/ambalaj (rămân la fel)
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
      {
        $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: {
          path: '$packagingDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Construim packagingOptions
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
          // Logica pentru packagingOptions
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
                      unitName: {
                        $ifNull: ['$palletTypeDetails.name', 'Palet'],
                      },
                      baseUnitEquivalent: {
                        $cond: {
                          if: {
                            $and: [
                              '$productDetails.packagingQuantity',
                              { $gt: ['$productDetails.packagingQuantity', 0] },
                            ],
                          },
                          then: {
                            $multiply: [
                              '$productDetails.itemsPerPallet',
                              '$productDetails.packagingQuantity',
                            ],
                          },
                          else: '$productDetails.itemsPerPallet',
                        },
                      },
                    },
                  ],
                  else: [],
                },
              },
              {
                $cond: {
                  if: {
                    $and: [
                      '$packagingDetails.itemsPerPallet',
                      { $gt: ['$packagingDetails.itemsPerPallet', 0] },
                    ],
                  },
                  then: [
                    {
                      unitName: {
                        $ifNull: ['$palletTypeDetails.name', 'Palet'],
                      },
                      baseUnitEquivalent: '$packagingDetails.itemsPerPallet',
                    },
                  ],
                  else: [],
                },
              },
            ],
          },
        },
      },

      // Proiectăm câmpurile finale + CALCULĂM STOCUL DISPONIBIL (AICI ADĂUGĂM)
      {
        $project: {
          _id: 1,
          totalStock: { $ifNull: ['$totalStock', 0] },
          totalReserved: { $ifNull: ['$totalReserved', 0] },
          availableStock: {
            $subtract: [
              { $ifNull: ['$totalStock', 0] },
              { $ifNull: ['$totalReserved', 0] },
            ],
          },
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
          itemType: {
            $cond: {
              if: '$productDetails.name',
              then: 'Produs',
              else: 'Ambalaj',
            },
          },
          packagingOptions: 1,
        },
      },
    ]

    if (query && query.trim() !== '') {
      const regex = new RegExp(query, 'i')
      pipeline.push({
        $match: {
          $or: [{ name: regex }, { productCode: regex }],
        },
      })
    }

    pipeline.push({ $sort: { name: 1 } })

    let combinedStock: AggregatedStockItem[] =
      await InventoryItemModel.aggregate(pipeline)

    combinedStock = combinedStock.filter((item) => item.name != null)

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
      //  Găsim intrările PENTRU locația specificată
      { $match: { location: locationId, stockableItemType: 'ERPProduct' } },

      //  Adăugăm quantityReserved specific locației (nu e nevoie de unwind pt asta)
      // Acest pas asigură că avem câmpul quantityReserved disponibil mai târziu
      { $addFields: { _quantityReserved: '$quantityReserved' } },

      //  Unwind și sortare pe loturi
      { $unwind: '$batches' },
      { $sort: { 'batches.entryDate': 1 } },

      //  Grupăm pe articol PENTRU a calcula sumele din loturi
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$batches.quantity' }, // Calculat din loturi
          totalValue: {
            $sum: { $multiply: ['$batches.quantity', '$batches.unitCost'] },
          },
          minPrice: { $min: '$batches.unitCost' },
          maxPrice: { $max: '$batches.unitCost' },
          lastPrice: { $last: '$batches.unitCost' },
          // ⭐ Păstrăm quantityReserved folosind $first (va fi aceeași valoare pentru toate loturile aceluiași item/locație)
          totalReservedForLocation: { $first: '$_quantityReserved' },
        },
      },
      // Pas 4: Lookup pentru detalii produs și packagingOptions (rămân la fel)
      ...getPackagingOptionsPipeline(),
      // Proiectăm câmpurile finale
      {
        $project: {
          _id: 1,
          totalStock: { $ifNull: ['$totalStock', 0] },
          totalReserved: { $ifNull: ['$totalReservedForLocation', 0] },
          availableStock: {
            $subtract: [
              { $ifNull: ['$totalStock', 0] },
              { $ifNull: ['$totalReservedForLocation', 0] },
            ],
          },
          minPrice: { $ifNull: ['$minPrice', 0] },
          maxPrice: { $ifNull: ['$maxPrice', 0] },
          lastPrice: { $ifNull: ['$lastPrice', 0] },
          averageCost: {
            $cond: {
              if: { $gt: ['$totalStock', 0] },
              then: { $divide: ['$totalValue', '$totalStock'] },
              else: 0,
            },
          },
          name: '$productDetails.name',
          unit: '$productDetails.unit',
          productCode: '$productDetails.productCode',
          itemType: 'Produs',
          packagingOptions: 1,
        },
      },
    ]

    // ---------- PIPELINE pentru AMBALAJE ----------
    const packagingPipeline: mongoose.PipelineStage[] = [
      //  Găsim intrările PENTRU locația specificată
      { $match: { location: locationId, stockableItemType: 'Packaging' } },

      //  Adăugăm quantityReserved specific locației
      { $addFields: { _quantityReserved: '$quantityReserved' } },

      //  Unwind și sortare pe loturi
      { $unwind: '$batches' },
      { $sort: { 'batches.entryDate': 1 } },

      // Grupăm pe articol PENTRU a calcula sumele din loturi
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
          totalReservedForLocation: { $first: '$_quantityReserved' },
        },
      },
      //  Lookup pentru detalii ambalaj și packagingOptions
      ...createPackagingOptionsPipelineForPackaging(),
      //  Proiectăm câmpurile finale
      {
        $project: {
          _id: 1,
          totalStock: { $ifNull: ['$totalStock', 0] },
          totalReserved: { $ifNull: ['$totalReservedForLocation', 0] },
          availableStock: {
            $subtract: [
              { $ifNull: ['$totalStock', 0] },
              { $ifNull: ['$totalReservedForLocation', 0] },
            ],
          },
          minPrice: { $ifNull: ['$minPrice', 0] },
          maxPrice: { $ifNull: ['$maxPrice', 0] },
          lastPrice: { $ifNull: ['$lastPrice', 0] },
          averageCost: {
            $cond: {
              if: { $gt: ['$totalStock', 0] },
              then: { $divide: ['$totalValue', '$totalStock'] },
              else: 0,
            },
          },
          name: '$packagingDetails.name',
          unit: '$packagingDetails.packagingUnit',
          productCode: '$packagingDetails.productCode',
          itemType: 'Ambalaj',
          packagingOptions: 1,
        },
      },
    ]

    // Executăm ambele pipeline-uri
    const [productStock, packagingStock] = await Promise.all([
      InventoryItemModel.aggregate(productPipeline),
      InventoryItemModel.aggregate(packagingPipeline),
    ])

    // Combinăm și filtrăm
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

    // Sortăm
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

  // Sortează loturile existente (dacă există)
  item.batches.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime())

  // IMPORTANT: totalStock ESTE ACUM CALCULAT ȘI SETAT
  // DE FUNCȚIA 'recordStockMovement' ÎNAINTE DE A APELA ASTA.
  // Noi doar citim valoarea.
  const totalStock = item.totalStock

  // Actualizăm prețurile DOAR dacă există stoc POZITIV.
  if (totalStock > 0 && item.batches.length > 0) {
    let totalValue = 0
    let maxPrice = 0
    let minPrice = Infinity

    for (const batch of item.batches) {
      totalValue += batch.quantity * batch.unitCost
      if (batch.unitCost > maxPrice) maxPrice = batch.unitCost
      if (batch.unitCost < minPrice) minPrice = batch.unitCost
    }

    item.averageCost = totalValue / totalStock
    item.maxPurchasePrice = maxPrice
    item.minPurchasePrice = minPrice === Infinity ? 0 : minPrice

    // Setăm lastPurchasePrice DOAR dacă avem loturi.
    item.lastPurchasePrice = item.batches[item.batches.length - 1].unitCost
  } else if (totalStock <= 0) {
    // Stocul e 0 sau negativ. Resetăm DOAR costurile de medie.
    item.averageCost = 0
    item.maxPurchasePrice = 0
    item.minPurchasePrice = 0
    // NU ATINGEM item.lastPurchasePrice. Acesta trebuie să persiste.
  }
  // Dacă stocul e > 0 dar 'batches' e gol (caz imposibil dacă logica e corectă),
  // pur și simplu nu facem nimic, păstrând valorile vechi.
}

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
  orderId: Types.ObjectId,
  clientId: Types.ObjectId,
  items: IOrderLineItem[],
  session: ClientSession
) {
  const RESERVATION_LOCATIONS_PRIORITY = ['DEPOZIT', 'CUSTODIE_GNS']

  for (const item of items) {
    if (
      !item.stockableItemType ||
      !item.quantityInBaseUnit ||
      !item.productId
    ) {
      continue
    }

    let quantityStillToReserve = item.quantityInBaseUnit
    if (quantityStillToReserve <= 0) continue

    // --- Verificare și rezervare stoc dedicat clientului ---
    const clientCustodyEntry = await InventoryItemModel.findOne({
      stockableItem: item.productId,
      location: 'CUSTODIE_PENTRU_CLIENT',
      clientId: clientId,
    }).session(session)

    if (clientCustodyEntry) {
      const availableInCustody =
        clientCustodyEntry.totalStock - clientCustodyEntry.quantityReserved
      if (availableInCustody > 0) {
        const amountToReserveFromCustody = Math.min(
          quantityStillToReserve,
          availableInCustody
        )

        //  Actualizează sumarul pe InventoryItem-ul de custodie
        clientCustodyEntry.quantityReserved += amountToReserveFromCustody
        await clientCustodyEntry.save({ session })

        // Creează "chitanța" de rezervare pentru custodie
        await StockReservationModel.create(
          [
            {
              orderId,
              orderLineItemId: item._id,
              stockableItem: item.productId,
              stockableItemType: item.stockableItemType,
              location: 'CUSTODIE_PENTRU_CLIENT',
              quantity: amountToReserveFromCustody,
              status: 'ACTIVE',
            },
          ],
          { session }
        )

        quantityStillToReserve -= amountToReserveFromCustody
      }
    }

    // --- Prioritatea 1 & 2: Cascada de rezervare din locațiile principale ---
    if (quantityStillToReserve > 0) {
      const inventoryEntries = await InventoryItemModel.find({
        stockableItem: item.productId,
        location: { $in: RESERVATION_LOCATIONS_PRIORITY },
      }).session(session)

      for (const location of RESERVATION_LOCATIONS_PRIORITY) {
        if (quantityStillToReserve <= 0) break

        const entryForLocation = inventoryEntries.find(
          (e) => e.location === location
        )
        if (!entryForLocation) continue

        const availableInLocation =
          entryForLocation.totalStock - entryForLocation.quantityReserved
        if (availableInLocation <= 0) continue

        const amountToReserveFromThisLocation = Math.min(
          quantityStillToReserve,
          availableInLocation
        )

        if (amountToReserveFromThisLocation > 0) {
          entryForLocation.quantityReserved += amountToReserveFromThisLocation
          await entryForLocation.save({ session })

          await StockReservationModel.create(
            [
              {
                orderId,
                orderLineItemId: item._id,
                stockableItem: item.productId,
                stockableItemType: item.stockableItemType,
                location: location,
                quantity: amountToReserveFromThisLocation,
                status: 'ACTIVE',
              },
            ],
            { session }
          )

          quantityStillToReserve -= amountToReserveFromThisLocation
        }
      }
    }

    // --- Gestionarea Backorder-ului ---
    if (quantityStillToReserve > 0) {
      await InventoryItemModel.findOneAndUpdate(
        { stockableItem: item.productId, location: 'DEPOZIT' },
        {
          $inc: { quantityReserved: quantityStillToReserve },
          $setOnInsert: {
            stockableItem: item.productId,
            stockableItemType: item.stockableItemType,
            location: 'DEPOZIT',
          },
        },
        { upsert: true, new: true, session }
      )

      await StockReservationModel.create(
        [
          {
            orderId,
            orderLineItemId: item._id,
            stockableItem: item.productId,
            stockableItemType: item.stockableItemType,
            location: 'DEPOZIT',
            quantity: quantityStillToReserve,
            status: 'ACTIVE',
          },
        ],
        { session }
      )
    }
  }
}

/**
 * Eliberează stocul rezervat (ex: la anularea unei comenzi confirmate).
 * O vom implementa complet când vom construi funcționalitatea de anulare.
 * @param items Liniile de comandă pentru care se eliberează stocul.
 * @param session Sesiunea MongoDB activă pentru tranzacție.
 */
export async function unreserveStock(
  items: IOrderLineItem[],
  session: ClientSession
) {
  for (const item of items) {
    if (!item.productId) continue

    //  Găsește toate rezervările active pentru această linie de comandă
    const reservationsToCancel = await StockReservationModel.find({
      orderLineItemId: item._id,
      status: 'ACTIVE',
    }).session(session)

    if (reservationsToCancel.length === 0) {
      continue
    }

    // Pentru fiecare rezervare, eliberează stocul din locația corectă
    for (const reservation of reservationsToCancel) {
      await InventoryItemModel.updateOne(
        {
          stockableItem: reservation.stockableItem,
          location: reservation.location,
        },
        {
          $inc: { quantityReserved: -reservation.quantity },
        },
        { session }
      )

      // Marchează rezervarea ca fiind anulată
      reservation.status = 'CANCELLED'
      await reservation.save({ session })
    }
  }
}
