'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
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
import { MOVEMENTS_PAGE_SIZE, STOCK_PAGE_SIZE } from '@/lib/constants'
import DeliveryNoteModel from '../financial/delivery-notes/delivery-note.model'
import '../client/client.model'
import '../suppliers/supplier.model'

export async function getInventoryLedger(
  stockableItemId: string,
  location?: string,
  page: number = 1,
) {
  await connectToDatabase()
  const limit = 50 // Afișăm 50 de rânduri pe pagină în fișa de magazie
  const skip = (page - 1) * limit

  const filter: FilterQuery<IStockMovementDoc> = {
    stockableItem: stockableItemId,
  }

  if (location) {
    // Mișcări care au plecat DIN sau au ajuns ÎN locația respectivă
    filter.$or = [{ locationFrom: location }, { locationTo: location }]
  }

  // Executăm query-ul și numărătoarea în paralel
  const [data, total] = await Promise.all([
    StockMovementModel.find(filter)
      .sort({ timestamp: -1 }) // Cele mai noi primele
      .skip(skip)
      .limit(limit)
      .lean(),
    StockMovementModel.countDocuments(filter),
  ])

  return {
    data: JSON.parse(JSON.stringify(data)),
    totalPages: Math.ceil(total / limit),
    totalDocs: total,
  }
}

export async function getCurrentStock(
  stockableItemId: string,
  locations?: string[],
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
      0,
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

export async function getAggregatedStockStatus(
  query: string = '',
  page: number = 1,
): Promise<{
  data: AggregatedStockItem[]
  totalPages: number
  totalDocs: number
  totals: { totalValue: number }
}> {
  try {
    await connectToDatabase()

    const skip = (page - 1) * STOCK_PAGE_SIZE

    // 1. FILTRARE
    const matchStage: mongoose.FilterQuery<IInventoryItemDoc> = {}

    if (query && query.trim() !== '') {
      const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // REGEX 1: Cod EXACT
      const exactCodeRegex = new RegExp(`^${escapedQuery}$`, 'i')

      // REGEX 2: Nume/Furnizor PARȚIAL
      const partialMatchRegex = new RegExp(escapedQuery, 'i')

      // A. Căutare Furnizori
      const SupplierModel = mongoose.models.Supplier
      const matchedSuppliers = await SupplierModel.find({
        name: partialMatchRegex,
      })
        .select('_id')
        .lean()

      const supplierIds = matchedSuppliers.map((s: any) => s._id)

      // B. Căutare Produse/Ambalaje legate de acei furnizori
      let itemIdsFromSupplier: any[] = []

      if (supplierIds.length > 0) {
        const productsWithSupplier = await ERPProductModel.find({
          'suppliers.supplier': { $in: supplierIds },
        })
          .select('_id')
          .lean()

        const packagingWithSupplier = await PackagingModel.find({
          'suppliers.supplier': { $in: supplierIds },
        })
          .select('_id')
          .lean()

        itemIdsFromSupplier = [
          ...productsWithSupplier.map((p) => p._id),
          ...packagingWithSupplier.map((p) => p._id),
        ]
      }

      // C. Construire filtru final
      matchStage.$or = [
        { searchableCode: exactCodeRegex }, // Cod Exact
        { searchableName: partialMatchRegex }, // Nume Parțial
      ]

      if (itemIdsFromSupplier.length > 0) {
        matchStage.$or.push({ stockableItem: { $in: itemIdsFromSupplier } })
      }
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },

      // 2. GRUPARE (Calculăm sumele doar pentru stocul pozitiv)
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$totalStock' },
          totalReserved: { $sum: '$quantityReserved' },

          // --- LOGICA PENTRU MEDIE PONDERATĂ ---
          // Adunăm valoarea (cantitate * preț) DOAR dacă stocul e > 0
          positiveStockValue: {
            $sum: {
              $cond: [
                { $gt: ['$totalStock', 0] },
                { $multiply: ['$totalStock', '$averageCost'] },
                0,
              ],
            },
          },
          // Adunăm cantitatea DOAR dacă stocul e > 0
          positiveStockQuantity: {
            $sum: {
              $cond: [{ $gt: ['$totalStock', 0] }, '$totalStock', 0],
            },
          },

          // --- LOGICA PENTRU MIN/MAX/LAST ---
          // Min Price: Ignorăm 0. Dacă e > 0 îl luăm, altfel null ($min ignoră null)
          minPrice: {
            $min: {
              $cond: [
                { $gt: ['$minPurchasePrice', 0] },
                '$minPurchasePrice',
                null,
              ],
            },
          },
          maxPrice: { $max: '$maxPurchasePrice' },
          lastPrice: { $max: '$lastPurchasePrice' }, // Folosim max ca aproximare pentru ultimul preț valid
          name: { $first: '$searchableName' },
          productCode: { $first: '$searchableCode' },
          unit: { $first: '$unitMeasure' },
          itemType: { $first: '$stockableItemType' },
        },
      },

      // 3. CALCUL FINAL PREȚ MEDIU (AddFields)
      {
        $addFields: {
          calculatedWeightedAverage: {
            $cond: [
              { $gt: ['$positiveStockQuantity', 0] }, // Avem stoc pozitiv?
              { $divide: ['$positiveStockValue', '$positiveStockQuantity'] }, // DA: Împărțim valoare la cantitate
              0, // NU: Prețul e 0
            ],
          },
        },
      },

      { $sort: { name: 1 } },

      // 4. PAGINARE & LOOKUPS
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          totals: [
            {
              $group: {
                _id: null,
                totalValue: { $sum: '$positiveStockValue' },
              },
            },
          ],
          data: [
            { $skip: skip },
            { $limit: STOCK_PAGE_SIZE },

            // Lookup Produs
            {
              $lookup: {
                from: 'erpproducts',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails',
              },
            },
            {
              $unwind: {
                path: '$productDetails',
                preserveNullAndEmptyArrays: true,
              },
            },

            // Lookup Ambalaj
            {
              $lookup: {
                from: 'packagings',
                localField: '_id',
                foreignField: '_id',
                as: 'packagingDetails',
              },
            },
            {
              $unwind: {
                path: '$packagingDetails',
                preserveNullAndEmptyArrays: true,
              },
            },

            // Lookup Palet
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

            // PROIECTARE FINALĂ
            {
              $project: {
                _id: 1,
                name: { $ifNull: ['$name', 'Necunoscut'] },
                productCode: { $ifNull: ['$productCode', ''] },
                unit: { $ifNull: ['$unit', '-'] },

                totalStock: 1,
                totalReserved: 1,
                availableStock: {
                  $subtract: ['$totalStock', '$totalReserved'],
                },
                averageCost: '$calculatedWeightedAverage',

                // Dacă minPrice a fost null (doar 0-uri), îl afișăm ca 0
                minPrice: { $ifNull: ['$minPrice', 0] },
                maxPrice: 1,
                lastPrice: 1,

                itemType: {
                  $cond: {
                    if: { $eq: ['$itemType', 'ERPProduct'] },
                    then: 'Produs',
                    else: 'Ambalaj',
                  },
                },

                // Packaging Options
                packagingOptions: {
                  $cond: {
                    if: { $eq: ['$itemType', 'ERPProduct'] },
                    then: {
                      $filter: {
                        input: [
                          {
                            $cond: {
                              if: {
                                $gt: ['$productDetails.packagingQuantity', 0],
                              },
                              then: {
                                unitName: '$productDetails.packagingUnit',
                                baseUnitEquivalent:
                                  '$productDetails.packagingQuantity',
                              },
                              else: null,
                            },
                          },
                          {
                            $cond: {
                              if: {
                                $gt: ['$productDetails.itemsPerPallet', 0],
                              },
                              then: {
                                unitName: {
                                  $ifNull: ['$palletTypeDetails.name', 'Palet'],
                                },
                                baseUnitEquivalent: {
                                  $cond: {
                                    if: {
                                      $gt: [
                                        '$productDetails.packagingQuantity',
                                        0,
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
                              else: null,
                            },
                          },
                        ],
                        as: 'opt',
                        cond: { $ne: ['$$opt', null] },
                      },
                    },
                    else: [],
                  },
                },
              },
            },
          ],
        },
      },
    ]

    const result = await InventoryItemModel.aggregate(pipeline)

    const data = result[0].data || []
    const totalDocs = result[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalDocs / STOCK_PAGE_SIZE)
    const totalsRaw = result[0].totals[0] || {}
    const totals = {
      totalValue: totalsRaw.totalValue || 0,
    }

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages,
      totalDocs,
      totals,
    }
  } catch (error) {
    console.error('Eroare la agregarea stocului:', error)
    return {
      data: [],
      totalPages: 0,
      totalDocs: 0,
      totals: { totalValue: 0 },
    }
  }
}

export async function getStockByLocation(
  locationId: InventoryLocation,
  query: string = '',
  page: number = 1,
): Promise<{
  data: AggregatedStockItem[]
  totalPages: number
  totalDocs: number
  totals: {
    totalValue: number
  }
}> {
  try {
    await connectToDatabase()

    const skip = (page - 1) * STOCK_PAGE_SIZE

    // 1. FILTRARE
    const matchStage: mongoose.FilterQuery<IInventoryItemDoc> = {
      location: locationId,
    }

    if (query && query.trim() !== '') {
      const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // REGEX 1: Pentru COD -> EXACT (Ancorat la început ^ și sfârșit $)
      const exactCodeRegex = new RegExp(`^${escapedQuery}$`, 'i')

      // REGEX 2: Pentru NUME și FURNIZOR -> PARȚIAL
      const partialMatchRegex = new RegExp(escapedQuery, 'i')

      // A. Căutare ID-uri Furnizori (Nume Parțial)
      const SupplierModel = mongoose.models.Supplier
      const matchedSuppliers = await SupplierModel.find({
        name: partialMatchRegex,
      })
        .select('_id')
        .lean()

      const supplierIds = matchedSuppliers.map((s: any) => s._id)

      // B. Căutare ID-uri Produse/Ambalaje (legate de furnizorii găsiți)
      let itemIdsFromSupplier: any[] = []

      if (supplierIds.length > 0) {
        // Căutăm în Produse
        const productsWithSupplier = await ERPProductModel.find({
          'suppliers.supplier': { $in: supplierIds },
        })
          .select('_id')
          .lean()

        // Căutăm în Ambalaje
        const packagingWithSupplier = await PackagingModel.find({
          'suppliers.supplier': { $in: supplierIds },
        })
          .select('_id')
          .lean()

        itemIdsFromSupplier = [
          ...productsWithSupplier.map((p) => p._id),
          ...packagingWithSupplier.map((p) => p._id),
        ]
      }

      // C. Filtru final ($OR)
      matchStage.$or = [
        { searchableCode: exactCodeRegex }, // Cod Exact
        { searchableName: partialMatchRegex }, // Nume Parțial
      ]

      // Dacă am găsit produse asociate furnizorului căutat, le adăugăm
      if (itemIdsFromSupplier.length > 0) {
        matchStage.$or.push({ stockableItem: { $in: itemIdsFromSupplier } })
      }
    }

    // 2. PIPELINE AGREGORE
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage }, // Filtrare
      { $sort: { searchableName: 1 } }, // Sortare

      {
        $facet: {
          // Ramura 1: Metadata (Număr total)
          metadata: [{ $count: 'total' }],

          // Ramura 2: TOTALURI (Calculate pe tot setul filtrat)
          totals: [
            {
              $group: {
                _id: null,
                // Cantitate: Suma netă (inclusiv negativ), conform cerinței
                totalQuantity: { $sum: '$totalStock' },

                // Valoare: DOAR stocul pozitiv. Stocul negativ/zero este ignorat la valoare.
                totalValue: {
                  $sum: {
                    $cond: [
                      { $gt: ['$totalStock', 0] }, // Condiție: Stoc > 0
                      {
                        $multiply: [
                          '$totalStock',
                          { $ifNull: ['$averageCost', 0] },
                        ],
                      },
                      0, // Altfel 0
                    ],
                  },
                },
              },
            },
          ],

          // Ramura 3: DATE (Paginate)
          data: [
            { $skip: skip },
            { $limit: STOCK_PAGE_SIZE },

            // --- LOOKUPS ---
            {
              $lookup: {
                from: 'erpproducts',
                localField: 'stockableItem',
                foreignField: '_id',
                as: 'productDetails',
              },
            },
            {
              $unwind: {
                path: '$productDetails',
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $lookup: {
                from: 'packagings',
                localField: 'stockableItem',
                foreignField: '_id',
                as: 'packagingDetails',
              },
            },
            {
              $unwind: {
                path: '$packagingDetails',
                preserveNullAndEmptyArrays: true,
              },
            },

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

            // --- PROIECTARE ---
            {
              $project: {
                _id: '$stockableItem',
                inventoryItemId: '$_id',
                name: { $ifNull: ['$searchableName', 'Produs Necunoscut'] },
                productCode: { $ifNull: ['$searchableCode', ''] },
                unit: { $ifNull: ['$unitMeasure', '-'] },

                totalStock: '$totalStock',
                totalReserved: '$quantityReserved',
                availableStock: {
                  $subtract: ['$totalStock', '$quantityReserved'],
                },

                averageCost: '$averageCost',
                minPrice: { $ifNull: ['$minPurchasePrice', 0] },
                maxPrice: '$maxPurchasePrice',
                lastPrice: '$lastPurchasePrice',

                itemType: {
                  $cond: {
                    if: { $eq: ['$stockableItemType', 'ERPProduct'] },
                    then: 'Produs',
                    else: 'Ambalaj',
                  },
                },

                packagingOptions: {
                  $cond: {
                    if: { $eq: ['$stockableItemType', 'ERPProduct'] },
                    then: {
                      $filter: {
                        input: [
                          {
                            $cond: {
                              if: {
                                $gt: ['$productDetails.packagingQuantity', 0],
                              },
                              then: {
                                unitName: '$productDetails.packagingUnit',
                                baseUnitEquivalent:
                                  '$productDetails.packagingQuantity',
                              },
                              else: null,
                            },
                          },
                          {
                            $cond: {
                              if: {
                                $gt: ['$productDetails.itemsPerPallet', 0],
                              },
                              then: {
                                unitName: {
                                  $ifNull: ['$palletTypeDetails.name', 'Palet'],
                                },
                                baseUnitEquivalent: {
                                  $cond: {
                                    if: {
                                      $gt: [
                                        '$productDetails.packagingQuantity',
                                        0,
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
                              else: null,
                            },
                          },
                        ],
                        as: 'opt',
                        cond: { $ne: ['$$opt', null] },
                      },
                    },
                    else: [],
                  },
                },
              },
            },
          ],
        },
      },
    ]

    const result = await InventoryItemModel.aggregate(pipeline)

    const data = result[0].data || []
    const totalDocs = result[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalDocs / STOCK_PAGE_SIZE)

    // Extragem totalurile (sau valori default 0)
    const totalsRaw = result[0].totals[0] || {}
    const totals = {
      totalValue: totalsRaw.totalValue || 0,
    }

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages,
      totalDocs,
      totals,
    }
  } catch (error) {
    console.error(`Eroare la getStockByLocation (${locationId}):`, error)
    return {
      data: [],
      totalPages: 0,
      totalDocs: 0,
      totals: { totalValue: 0 },
    }
  }
}
export async function getStockMovements(
  filters: MovementsFiltersState,
  page: number = 1,
) {
  try {
    await connectToDatabase()
    const skip = (page - 1) * MOVEMENTS_PAGE_SIZE

    const pipeline: mongoose.PipelineStage[] = []

    // 1. FILTRE STANDARD (Dată, Locație, Tip)
    const initialMatch: mongoose.FilterQuery<IStockMovementDoc> = {}

    if (filters.dateRange?.from) {
      initialMatch.timestamp = {
        $gte: filters.dateRange.from,
        ...(filters.dateRange.to && { $lte: filters.dateRange.to }),
      }
    }
    if (filters.location && filters.location !== 'ALL') {
      initialMatch.$or = [
        { locationFrom: filters.location },
        { locationTo: filters.location },
      ]
    }
    if (filters.type && filters.type !== 'ALL') {
      initialMatch.movementType = filters.type
    }

    if (Object.keys(initialMatch).length > 0) {
      pipeline.push({ $match: initialMatch })
    }

    const hasSearchQuery = filters.q && filters.q.trim() !== ''

    // Dacă NU avem search text, sortăm acum (optimizare viteză)
    if (!hasSearchQuery) {
      pipeline.push({ $sort: { timestamp: -1 } })
    }

    // 2. LOOKUPS (Necesar pentru a accesa Numele și Codul produsului)
    pipeline.push(
      {
        $lookup: {
          from: 'erpproducts',
          localField: 'stockableItem',
          foreignField: '_id',
          as: 'erpProductDetails',
        },
      },
      {
        $unwind: {
          path: '$erpProductDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'packagings',
          localField: 'erpProductDetails.palletTypeId',
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
        $lookup: {
          from: 'packagings',
          localField: 'stockableItem',
          foreignField: '_id',
          as: 'packagingDetails',
        },
      },
      {
        $unwind: {
          path: '$packagingDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    )

    // Lookup-uri secundare (doar pentru afișare date finale, nu pentru căutare)
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'responsibleUser',
          foreignField: '_id',
          as: 'responsibleUserDetails',
        },
      },
      {
        $unwind: {
          path: '$responsibleUserDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplierDetails',
        },
      },
      {
        $unwind: { path: '$supplierDetails', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientDetails',
        },
      },
      { $unwind: { path: '$clientDetails', preserveNullAndEmptyArrays: true } },
    )

    // 3. FILTRARE TEXT: NUME & PARTENER (Parțial) vs COD (Exact)
    if (hasSearchQuery) {
      const searchTerm = filters.q!.trim()

      // Regex pentru TEXT (Nume Produs, Nume Partener) - Căutare parțială ('i' - case insensitive)
      const regexText = new RegExp(searchTerm, 'i')

      // Regex pentru COD - Căutare EXACTĂ (ancorat cu ^ și $)
      const regexCode = new RegExp(`^${searchTerm}$`, 'i')

      pipeline.push({
        $match: {
          $or: [
            // A. Căutare în Nume Produs/Ambalaj (Parțial)
            { 'erpProductDetails.name': regexText },
            { 'packagingDetails.name': regexText },

            // B. Căutare în Cod Produs/Ambalaj (Strictă - Exactă)
            { 'erpProductDetails.productCode': regexCode },
            { 'packagingDetails.productCode': regexCode },

            // C. Căutare în Nume Partener - Furnizor sau Client (Parțial - NOU)
            { 'supplierDetails.name': regexText },
            { 'clientDetails.name': regexText },
          ],
        },
      })

      // Sortăm după filtrare
      pipeline.push({ $sort: { timestamp: -1 } })
    }

    // 4. FACET (Paginare + Totaluri)
    const inTypesArray = Array.from(IN_TYPES)
    const outTypesArray = Array.from(OUT_TYPES)

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
              documentNumber: 1,
              qualityDetails: 1,
              lineCost: { $ifNull: ['$lineCost', 0] },
              unitCost: 1,
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
                code: {
                  $ifNull: [
                    '$erpProductDetails.productCode',
                    '$packagingDetails.productCode',
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
              packagingOptions: {
                $cond: {
                  if: { $ifNull: ['$erpProductDetails', false] }, // Doar dacă e Produs (nu ambalaj)
                  then: {
                    $filter: {
                      input: [
                        // Opțiunea 1: Bax/Ambalaj Secundar
                        {
                          $cond: {
                            if: {
                              $gt: ['$erpProductDetails.packagingQuantity', 0],
                            },
                            then: {
                              unitName: '$erpProductDetails.packagingUnit',
                              baseUnitEquivalent:
                                '$erpProductDetails.packagingQuantity',
                            },
                            else: null,
                          },
                        },
                        // Opțiunea 2: Palet
                        {
                          $cond: {
                            if: {
                              $gt: ['$erpProductDetails.itemsPerPallet', 0],
                            },
                            then: {
                              unitName: {
                                $ifNull: ['$palletTypeDetails.name', 'Palet'],
                              },
                              baseUnitEquivalent: {
                                $cond: {
                                  if: {
                                    $gt: [
                                      '$erpProductDetails.packagingQuantity',
                                      0,
                                    ],
                                  },
                                  then: {
                                    $multiply: [
                                      '$erpProductDetails.itemsPerPallet',
                                      '$erpProductDetails.packagingQuantity',
                                    ],
                                  },
                                  else: '$erpProductDetails.itemsPerPallet',
                                },
                              },
                            },
                            else: null,
                          },
                        },
                      ],
                      as: 'opt',
                      cond: { $ne: ['$$opt', null] },
                    },
                  },
                  else: [], // Pentru ambalaje returnăm gol
                },
              },
            },
          },
        ],

        totals: [
          {
            $group: {
              _id: null,
              totalValueIn: {
                $sum: {
                  $cond: [
                    { $in: ['$movementType', inTypesArray] },
                    '$lineCost',
                    0,
                  ],
                },
              },
              totalValueOut: {
                $sum: {
                  $cond: [
                    { $in: ['$movementType', outTypesArray] },
                    '$lineCost',
                    0,
                  ],
                },
              },
              totalQtyIn: {
                $sum: {
                  $cond: [
                    { $in: ['$movementType', inTypesArray] },
                    '$quantity',
                    0,
                  ],
                },
              },
              totalQtyOut: {
                $sum: {
                  $cond: [
                    { $in: ['$movementType', outTypesArray] },
                    '$quantity',
                    0,
                  ],
                },
              },
              distinctUMs: { $addToSet: '$unitMeasure' },
            },
          },
          {
            $project: {
              totalValueIn: 1,
              totalValueOut: 1,
              // Returnăm cantitatea doar dacă avem o singură unitate de măsură
              totalQtyIn: {
                $cond: [
                  { $eq: [{ $size: '$distinctUMs' }, 1] },
                  '$totalQtyIn',
                  null,
                ],
              },
              totalQtyOut: {
                $cond: [
                  { $eq: [{ $size: '$distinctUMs' }, 1] },
                  '$totalQtyOut',
                  null,
                ],
              },
              commonUnit: {
                $cond: [
                  { $eq: [{ $size: '$distinctUMs' }, 1] },
                  { $arrayElemAt: ['$distinctUMs', 0] },
                  'MIXED',
                ],
              },
            },
          },
        ],
      },
    })

    const result = await StockMovementModel.aggregate(pipeline)

    const data = result[0].data || []
    const totalDocs = result[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalDocs / MOVEMENTS_PAGE_SIZE)
    const totalsData = result[0].totals[0] || {
      totalValueIn: 0,
      totalValueOut: 0,
      totalQtyIn: null,
      totalQtyOut: null,
      commonUnit: 'MIXED',
    }

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages,
      totalDocs,
      totals: JSON.parse(JSON.stringify(totalsData)),
    }
  } catch (error) {
    console.error('Eroare la preluarea mișcărilor de stoc:', error)
    return { data: [], totalPages: 0, totalDocs: 0, totals: null }
  }
}

export async function getStockMovementDetails(
  movementId: string,
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
        movement.referenceId,
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
  productId: string,
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
        }),
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
          new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime(),
      )
    }

    const result = { ...itemDetails, locations: inventoryEntries }

    result.packagingOptions = result.packagingOptions.filter(
      (opt: PackagingOption) => opt && opt.unitName && opt.baseUnitEquivalent,
    )

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error(
      'Eroare la preluarea detaliilor de stoc pentru produs:',
      error,
    )
    return null
  }
}
