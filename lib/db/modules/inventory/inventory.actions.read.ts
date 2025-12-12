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
  location?: string,
  page: number = 1
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

    // 1. FILTRARE PRELIMINARĂ (Folosind indexii rapizi)
    // Căutăm direct în InventoryItems înainte de a grupa, pentru viteză maximă.
    const matchStage: mongoose.FilterQuery<IInventoryItemDoc> = {}

    if (query && query.trim() !== '') {
      const regex = new RegExp(query, 'i')
      matchStage.$or = [{ searchableName: regex }, { searchableCode: regex }]
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },

      // 2. GRUPARE (Agregare pe Articol - SUMA TUTUROR LOCAȚIILOR)
      {
        $group: {
          _id: '$stockableItem', // ID-ul produsului

          // Calculăm totalurile din câmpurile deja calculate pe fiecare locație
          totalStock: { $sum: '$totalStock' },
          totalReserved: { $sum: '$quantityReserved' },

          // Luăm detaliile statice din primul document găsit (sunt identice peste tot)
          // Folosim câmpurile denormalizate pentru a evita lookup-ul prematur
          name: { $first: '$searchableName' },
          productCode: { $first: '$searchableCode' },
          unit: { $first: '$unitMeasure' },
          itemType: { $first: '$stockableItemType' },

          // Pentru prețuri, facem o medie simplă a mediilor (sau min/max global)
          averageCost: { $avg: '$averageCost' },
          minPrice: { $min: '$minPurchasePrice' },
          maxPrice: { $max: '$maxPurchasePrice' },
          lastPrice: { $last: '$lastPurchasePrice' }, // Aproximativ ultimul preț
        },
      },

      // 3. SORTARE (După numele agregat)
      { $sort: { name: 1 } },

      // 4. PAGINARE & LOOKUPS (Facet - doar pentru pagina curentă)
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: MOVEMENTS_PAGE_SIZE },

            // --- LOOKUPS (Doar pentru cele 10 rezultate finale) ---
            // Necesar pentru packagingOptions

            // Lookup Produs
            {
              $lookup: {
                from: 'erpproducts',
                localField: '_id', // _id este stockableItem
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

            // Lookup Palet (pentru calcul conversie)
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

            // --- PROIECTARE FINALĂ ---
            {
              $project: {
                _id: 1, // ID produs

                // Date din grupare (rapide)
                name: { $ifNull: ['$name', 'Necunoscut'] },
                productCode: { $ifNull: ['$productCode', ''] },
                unit: { $ifNull: ['$unit', '-'] },

                totalStock: 1,
                totalReserved: 1,
                availableStock: {
                  $subtract: ['$totalStock', '$totalReserved'],
                },

                averageCost: 1,
                minPrice: 1,
                maxPrice: 1,
                lastPrice: 1,

                // Normalizare itemType pentru frontend ('Produs' / 'Ambalaj')
                itemType: {
                  $cond: {
                    if: { $eq: ['$itemType', 'ERPProduct'] },
                    then: 'Produs',
                    else: 'Ambalaj',
                  },
                },

                // Reconstrucția logicii pentru packagingOptions
                packagingOptions: {
                  $cond: {
                    if: { $eq: ['$itemType', 'ERPProduct'] },
                    then: {
                      $filter: {
                        input: [
                          // Opțiunea 1: Bax
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
                          // Opțiunea 2: Palet
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

    const skip = (page - 1) * MOVEMENTS_PAGE_SIZE

    // 1. FILTRARE EFICIENTĂ (Folosind datele denormalizate)
    // Nu mai facem lookup ca să căutăm numele. Îl avem deja.
    const matchStage: mongoose.FilterQuery<IInventoryItemDoc> = {
      location: locationId,
      // totalStock: { $gt: 0 }, // Decomentează dacă vrei să ascunzi produsele cu stoc 0
    }

    if (query && query.trim() !== '') {
      const regex = new RegExp(query, 'i')
      matchStage.$or = [{ searchableName: regex }, { searchableCode: regex }]
    }

    // 2. PIPELINE SIMPLIFICAT
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },

      // Sortare rapidă (avem index pe searchableName)
      { $sort: { searchableName: 1 } },

      // 3. PAGINARE ÎN BAZA DE DATE (Facet)
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: MOVEMENTS_PAGE_SIZE },

            // --- LOOKUPS (Doar pentru cele 10-20 produse de pe pagină) ---
            // Le facem doar ca să obținem detaliile pentru "packagingOptions" (conversii)

            // Lookup Produs
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

            // Lookup Ambalaj
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

            // Lookup Tip Palet (Pentru calcul conversie palet)
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

            // --- PROIECTARE FINALĂ ---
            {
              $project: {
                _id: '$stockableItem', // Frontend-ul vrea ID-ul produsului aici
                inventoryItemId: '$_id', // Păstrăm și ID-ul documentului de inventar

                // Date directe (Super rapid)
                name: { $ifNull: ['$searchableName', 'Produs Necunoscut'] },
                productCode: { $ifNull: ['$searchableCode', ''] },
                unit: { $ifNull: ['$unitMeasure', '-'] },

                // Valori pre-calculate (Nu mai facem sume pe batches)
                totalStock: '$totalStock',
                totalReserved: '$quantityReserved',
                availableStock: {
                  $subtract: ['$totalStock', '$quantityReserved'],
                },

                // Prețuri pre-calculate
                averageCost: '$averageCost',
                minPrice: '$minPurchasePrice',
                maxPrice: '$maxPurchasePrice',
                lastPrice: '$lastPurchasePrice',

                itemType: {
                  $cond: {
                    if: { $eq: ['$stockableItemType', 'ERPProduct'] },
                    then: 'Produs',
                    else: 'Ambalaj',
                  },
                },

                // Reconstruim logica ta pentru Dropdown-uri de unități (Palet/Bax)
                // Aceasta se bazează pe datele din Lookup-urile de mai sus
                packagingOptions: {
                  $cond: {
                    if: { $eq: ['$stockableItemType', 'ERPProduct'] },
                    then: {
                      $filter: {
                        input: [
                          // Opțiunea 1: Bax/Ambalaj Secundar
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
                          // Opțiunea 2: Palet
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
                    else: [], // Ambalajele nu au opțiuni de conversie
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
    const totalPages = Math.ceil(totalDocs / MOVEMENTS_PAGE_SIZE)

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages,
      totalDocs,
    }
  } catch (error) {
    console.error(`Eroare la getStockByLocation (${locationId}):`, error)
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

    // --- OPTIMIZARE: Filtre "Ușoare" (Indexate) ---
    // Construim filtrul inițial pentru a reduce drastic setul de date
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

    // Aplicăm filtrul ușor la începutul pipeline-ului
    if (Object.keys(initialMatch).length > 0) {
      pipeline.push({ $match: initialMatch })
    }

    // Verificăm dacă avem căutare text (care necesită Join-uri scumpe)
    const hasSearchQuery = filters.q && filters.q.trim() !== ''

    // Dacă NU avem search text, sortăm acum (foarte rapid)
    if (!hasSearchQuery) {
      pipeline.push({ $sort: { timestamp: -1 } })
    }

    // --- LOOKUPS (Join-uri) ---
    // Le facem acum. Dacă nu avem search text, pipeline-ul are deja puține documente (filtrate).
    // Dacă avem search text, din păcate trebuie să le facem pe toate.

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
      $unwind: { path: '$supplierDetails', preserveNullAndEmptyArrays: true },
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
      $unwind: { path: '$clientDetails', preserveNullAndEmptyArrays: true },
    })

    // --- FILTRARE TEXT (SEARCH) ---
    // Se aplică DOAR dacă userul a scris ceva în search
    if (hasSearchQuery) {
      const regex = new RegExp(filters.q!, 'i')
      pipeline.push({
        $match: {
          $or: [
            { 'erpProductDetails.name': regex },
            { 'packagingDetails.name': regex },
            { 'supplierDetails.name': regex },
            { responsibleUserName: regex },
            { note: regex },
          ],
        },
      })
      // Sortăm după filtrare
      pipeline.push({ $sort: { timestamp: -1 } })
    }

    // --- PAGINARE FINALĂ (FACET) ---
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
            },
          },
        ],
      },
    })

    const result = await StockMovementModel.aggregate(pipeline)
    const data = result[0].data || []
    const totalDocs = result[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalDocs / MOVEMENTS_PAGE_SIZE)

    return { data: JSON.parse(JSON.stringify(data)), totalPages, totalDocs }
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
