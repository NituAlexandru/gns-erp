'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import { StockMovementInput, StockMovementSchema } from './validator'
import mongoose, { FilterQuery } from 'mongoose'
import { IN_TYPES, OUT_TYPES, StockMovementType } from './constants'
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
import { MOVEMENTS_PAGE_SIZE } from '@/lib/constants'
import DeliveryNoteModel from '../financial/delivery-notes/delivery-note.model'
import '../client/client.model'
import '../suppliers/supplier.model'

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
  query: string = '',
  page: number = 1
): Promise<{
  data: AggregatedStockItem[]
  totalPages: number
  totalDocs: number
}> {
  try {
    await connectToDatabase()

    const skip = (page - 1) * MOVEMENTS_PAGE_SIZE

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
      // Lookup Pallet Type
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
          // Logica complexă pentru packagingOptions
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
                              {
                                $gt: ['$productDetails.packagingQuantity', 0],
                              },
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
      // Proiectare finală
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
          name: {
            $ifNull: ['$productDetails.name', '$packagingDetails.name'],
          },
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

    // --- FILTRARE ---
    if (query && query.trim() !== '') {
      const regex = new RegExp(query, 'i')
      pipeline.push({
        $match: {
          $or: [{ name: regex }, { productCode: regex }],
        },
      })
    }

    // --- SORTARE ---
    pipeline.push({ $sort: { name: 1 } })

    // --- PAGINARE CU FACET ---
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: MOVEMENTS_PAGE_SIZE }],
      },
    })

    const result = await InventoryItemModel.aggregate(pipeline)

    const data = result[0].data || []
    const totalDocs = result[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalDocs / MOVEMENTS_PAGE_SIZE)

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages,
      totalDocs,
    }
  } catch (error) {
    console.error('Eroare la agregarea stocului:', error)
    return { data: [], totalPages: 0, totalDocs: 0 }
  }
}

export async function getStockByLocation(
  locationId: InventoryLocation,
  query: string = '',
  page: number = 1
): Promise<{
  data: AggregatedStockItem[]
  totalPages: number
  totalDocs: number
}> {
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
    combined.sort((a, b) => a.name.localeCompare(b.name))

    // --- PAGINARE IN MEMORIE ---
    const totalDocs = combined.length
    const totalPages = Math.ceil(totalDocs / MOVEMENTS_PAGE_SIZE)
    const startIndex = (page - 1) * MOVEMENTS_PAGE_SIZE
    const paginatedData = combined.slice(
      startIndex,
      startIndex + MOVEMENTS_PAGE_SIZE
    )

    return {
      data: JSON.parse(JSON.stringify(paginatedData)),
      totalPages,
      totalDocs,
    }
  } catch (error) {
    console.error(
      `Eroare la agregarea stocului pentru locația ${locationId}:`,
      error
    )
    return { data: [], totalPages: 0, totalDocs: 0 }
  }
}
export async function getStockMovements(
  filters: MovementsFiltersState,
  page: number = 1
) {
  try {
    await connectToDatabase()

    const skip = (page - 1) * MOVEMENTS_PAGE_SIZE
    const pipeline: mongoose.PipelineStage[] = []

    // 1. LOOKUPS
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

    pipeline.push({
      $lookup: {
        from: 'suppliers',
        localField: 'supplierId',
        foreignField: '_id',
        as: 'supplierDetails',
      },
    })
    pipeline.push({
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'clientDetails',
      },
    })
    pipeline.push({
      $unwind: {
        path: '$supplierDetails',
        preserveNullAndEmptyArrays: true,
      },
    })

    // 2. FILTRE (Aceleași ca înainte)
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
          { 'supplierDetails.name': regex },
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

    // 3. SORTARE
    pipeline.push({ $sort: { timestamp: -1 } })

    // 4. PAGINARE CU FACET
    // Folosim $facet pentru a obține și datele și numărul total într-un singur query
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: skip },
          { $limit: MOVEMENTS_PAGE_SIZE },
          {
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
                  $ifNull: [
                    '$erpProductDetails.name',
                    '$packagingDetails.name',
                  ],
                },
              },
              supplier: {
                _id: '$supplierDetails._id',
                name: '$supplierDetails.name',
              },
              client: {
                _id: '$clientDetails._id',
                name: '$clientDetails.name',
              },
              documentNumber: 1,
              qualityDetails: 1,
            },
          },
        ],
      },
    })

    const result = await StockMovementModel.aggregate(pipeline)

    // Extragem rezultatele din facet
    const data = result[0].data || []
    const totalDocs = result[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalDocs / MOVEMENTS_PAGE_SIZE)

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages,
      totalDocs,
    }
  } catch (error) {
    console.error('Eroare la preluarea mișcărilor de stoc:', error)
    return { data: [], totalPages: 0, totalDocs: 0 }
  }
}

export async function getStockMovementDetails(
  movementId: string
): Promise<StockMovementDetails | null> {
  try {
    await connectToDatabase()

    const movement = await StockMovementModel.findById(movementId)
      .populate({
        path: 'stockableItem',
        select:
          'name productCode unit packagingUnit packagingQuantity itemsPerPallet',
      })
      .populate({ path: 'responsibleUser', select: 'name' })
      .populate('supplierId', 'name')
      .populate('clientId', 'name')
      .lean()

    if (!movement) {
      throw new Error('Mișcarea de stoc nu a fost găsită.')
    }

    let referenceDetails = null

    const type = movement.movementType as StockMovementType
    // ------------------------------------------------------------
    // CAZUL A: INTRARE (Recepție)
    // ------------------------------------------------------------
    // Dacă tipul mișcării este unul de intrare (ex: RECEPTIE, RETUR_CLIENT)
    if (IN_TYPES.has(type) && movement.referenceId) {
      referenceDetails = await ReceptionModel.findById(movement.referenceId)
        .populate({ path: 'supplier', select: 'name' })
        .populate({ path: 'createdBy', select: 'name' })
        .populate({ path: 'products.product' })
        .populate({ path: 'packagingItems.packaging' })
        .lean()
    }
    // ------------------------------------------------------------
    // CAZUL B: IEȘIRE (Aviz / Vânzare)
    // ------------------------------------------------------------
    // Dacă tipul mișcării este unul de ieșire (ex: DIRECT_SALE, DELIVERY_FULL_TRUCK)
    else if (OUT_TYPES.has(type) && movement.referenceId) {
      referenceDetails = await DeliveryNoteModel.findById(
        movement.referenceId
      ).lean()
    }

    // Notă: Structura unui Aviz este diferită de cea a unei Recepții.
    // Frontend-ul va trebui să știe să afișeze fie `products` (dacă e recepție),
    // fie `items` (dacă e aviz).

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
      })
        .populate('batches.supplierId', 'name')
        .lean()
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
    })
      .populate('batches.supplierId', 'name')
      .lean()

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

// Funcțiile getAggregatedStockStatus și getStockByLocation: Aceste două
// funcții sunt acum ineficiente. Ele încă fac calculul complex ("numără
// cutiile manual") la fiecare apel. Acum că avem câmpurile de sumar
// pre-calculate pe InventoryItem, aceste funcții ar trebui simplificate
// radical pentru a citi direct acele sumare. Asta ar face pagina principală
// de inventar la fel de rapidă ca cea de produse.
