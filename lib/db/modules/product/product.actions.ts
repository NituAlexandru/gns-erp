'use server'

import '@/lib/db/modules/client/client.model'
import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ProductInputSchema, ProductUpdateSchema } from './validator'
import { formatError } from '@/lib/utils'
import { CategoryModel } from '../category'
import '@/lib/db/modules/suppliers/supplier.model'
import { ClientSession, FilterQuery, Types } from 'mongoose'
import { PRODUCT_PAGE_SIZE } from './constants'
import { getGlobalHighestCostInStock } from '../inventory/pricing'
import {
  IProductDoc,
  IProductInput,
  IProductUpdate,
  ItemWithMarkups,
  MarkupPatch,
  ProductForOrderLine,
  SearchedProduct,
} from './types'
import InventoryItemModel from '../inventory/inventory.model'
import PackagingModel from '../packaging-products/packaging.model'
import ERPProductModel from './product.model'

// O funcție helper pentru a verifica duplicatele
async function checkForDuplicateCodes(payload: {
  productCode: string
  barCode?: string
  _id?: string
}) {
  const { productCode, barCode, _id } = payload
  const commonQuery = _id ? { _id: { $ne: _id } } : {}

  const existingProduct = await ERPProductModel.findOne({
    productCode,
    ...commonQuery,
  }).lean()
  if (existingProduct) {
    return 'Acest cod de produs este deja utilizat.'
  }

  if (barCode) {
    const existingBarcode = await ERPProductModel.findOne({
      barCode,
      ...commonQuery,
    }).lean()
    if (existingBarcode) {
      return 'Acest cod de bare este deja utilizat.'
    }
  }

  return null
}
/**
 * Adaugă sau actualizează un furnizor în lista de furnizori a unui produs.
 * Folosită automat la confirmarea unei recepții (Auto-Discovery).
 */
export async function addOrUpdateSupplierForProduct(
  productId: string,
  supplierId: string,
  price: number,
  supplierProductCode: string | undefined,
  session: ClientSession
) {
  if (!productId || !supplierId) return

  const product = await ERPProductModel.findById(productId).session(session)

  if (!product) {
    throw new Error(
      `Produsul cu ID ${productId} nu a fost găsit pentru actualizarea furnizorului.`
    )
  }

  const supplierObjectId = new Types.ObjectId(supplierId)

  // Căutăm dacă furnizorul există deja
  const existingSupplierIndex = product.suppliers.findIndex(
    (s) => s.supplier.toString() === supplierId
  )

  if (existingSupplierIndex > -1) {
    // UPDATE: Furnizor existent -> actualizăm prețul și data
    product.suppliers[existingSupplierIndex].lastPurchasePrice = price
    product.suppliers[existingSupplierIndex].updatedAt = new Date()

    // Actualizăm codul doar dacă a fost furnizat unul nou (diferit de null/undefined/gol)
    if (supplierProductCode && supplierProductCode.trim() !== '') {
      product.suppliers[existingSupplierIndex].supplierProductCode =
        supplierProductCode
    }
  } else {
    // INSERT: Furnizor nou -> îl adăugăm în listă
    product.suppliers.push({
      supplier: supplierObjectId,
      lastPurchasePrice: price,
      supplierProductCode: supplierProductCode || '',
      isMain: product.suppliers.length === 0, // Dacă e primul, îl punem main implicit
      updatedAt: new Date(),
    })
  }

  await product.save({ session })
}

// CREATE
export async function createProduct(data: IProductInput) {
  try {
    const payload = ProductInputSchema.parse(data)
    await connectToDatabase()

    const duplicateError = await checkForDuplicateCodes(payload)
    if (duplicateError) {
      return { success: false, message: duplicateError }
    }

    await ERPProductModel.create(payload)
    revalidatePath('/admin/products')
    return { success: true, message: 'Produs creat cu succes!' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// UPDATE
export async function updateProduct(data: IProductUpdate) {
  try {
    const payload = ProductUpdateSchema.parse(data)
    await connectToDatabase()

    const duplicateError = await checkForDuplicateCodes(payload)
    if (duplicateError) {
      return { success: false, message: duplicateError }
    }

    await ERPProductModel.findByIdAndUpdate(payload._id, payload)
    revalidatePath('/admin/products')
    return { success: true, message: 'Produs actualizat cu succes!' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
// GET ONE PRODUCT BY ID
export async function getProductById(id: string): Promise<IProductDoc> {
  await connectToDatabase()
  const doc = await ERPProductModel.findById(id)
    .populate('category')
    .populate('mainCategory')
    .populate('suppliers.supplier')
    .lean()
  if (!doc) throw new Error('Product not found')
  return JSON.parse(JSON.stringify(doc)) as IProductDoc
}
// DELETE
export async function deleteProduct(id: string) {
  try {
    await connectToDatabase()
    const res = await ERPProductModel.findByIdAndDelete(id)
    if (!res) throw new Error('Product not found')
    revalidatePath('/admin/products')
    return { success: true, message: 'Produs sters cu succes!' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
// GET ALL CATEGORIES
export async function getAllCategories(): Promise<
  { _id: string; name: string; slug: string }[]
> {
  await connectToDatabase()
  // Fetch only those categories that have a parent (mainCategory) set:
  return CategoryModel.find({ mainCategory: { $exists: true, $ne: null } })
    .select('_id name slug')
    .lean()
    .then((cats) =>
      cats.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        slug: c.slug,
      }))
    )
}
// GET PRODUCT BY SLUG
export async function getProductBySlug(
  slug: string,
  options?: { includeUnpublished: boolean }
): Promise<IProductDoc> {
  await connectToDatabase()

  // build a typed filter
  const filter: FilterQuery<IProductDoc> = { slug }
  if (!options?.includeUnpublished) {
    filter.isPublished = true
  }

  const doc = await ERPProductModel.findOne(filter)
    .populate('category')
    .populate('mainCategory')
    .populate('suppliers.supplier')
    .populate({
      path: 'clientMarkups',
      populate: { path: 'clientId' },
    })
    .lean()

  if (!doc) {
    console.log('[DBG] no document found for slug:', slug)
    throw new Error('Product not found')
  }

  return JSON.parse(JSON.stringify(doc)) as IProductDoc
}

// GET ALL PRODUCTS with filters
export async function getAllProducts({
  query,
  category,
  mainCategory,
  tag,
  price,
  rating,
  sort,
  page,
  limit,
}: {
  query: string
  category: string
  mainCategory: string
  tag: string
  price?: string
  rating?: string
  sort?: string
  page: number
  limit?: number
}) {
  await connectToDatabase()
  limit = limit || PRODUCT_PAGE_SIZE
  const skipAmount = limit * (Number(page) - 1)

  const queryFilter =
    query && query !== 'all' ? { name: { $regex: query, $options: 'i' } } : {}
  let categoryFilter = {}
  if (category && category !== 'all') {
    if (Types.ObjectId.isValid(category)) {
      categoryFilter = { category: new Types.ObjectId(category) }
    } else {
      const catDoc = await CategoryModel.findOne({ slug: category })
        .select('_id')
        .lean()
      if (catDoc) {
        categoryFilter = { category: catDoc._id }
      } else {
        return {
          products: [],
          totalPages: 0,
          totalProducts: 0,
          from: 0,
          to: 0,
        }
      }
    }
  }
  let mainCategoryFilter = {}
  if (mainCategory && mainCategory !== 'all') {
    if (Types.ObjectId.isValid(mainCategory)) {
      mainCategoryFilter = {
        mainCategory: new Types.ObjectId(mainCategory),
      }
    } else {
      const mcDoc = await CategoryModel.findOne({ slug: mainCategory })
        .select('_id')
        .lean()
      if (mcDoc) {
        mainCategoryFilter = { mainCategory: mcDoc._id }
      } else {
        return {
          products: [],
          totalPages: 0,
          totalProducts: 0,
          from: 0,
          to: 0,
        }
      }
    }
  }
  const tagFilter = tag && tag !== 'all' ? { tags: tag } : {}
  const ratingFilter =
    rating && rating !== 'all' ? { avgRating: { $gte: Number(rating) } } : {}
  const priceFilter =
    price && price !== 'all'
      ? {
          price: {
            $gte: Number(price.split('-')[0]),
            $lte: Number(price.split('-')[1]),
          },
        }
      : {}

  const order: Record<string, 1 | -1> =
    sort === 'best-selling'
      ? { numSales: -1, _id: -1 }
      : sort === 'price-low-to-high'
        ? { price: 1, _id: -1 }
        : sort === 'price-high-to-low'
          ? { price: -1, _id: -1 }
          : sort === 'avg-customer-review'
            ? { avgRating: -1, _id: -1 }
            : { _id: -1 }

  const products = await ERPProductModel.find({
    isPublished: true,
    ...queryFilter,
    ...categoryFilter,
    ...mainCategoryFilter,
    ...tagFilter,
    ...priceFilter,
    ...ratingFilter,
  })
    .sort(order)
    .skip(skipAmount)
    .limit(limit)
    .populate('category', '_id name slug')
    .populate('mainCategory', '_id name slug')
    .lean()

  const countProducts = await ERPProductModel.countDocuments({
    isPublished: true,
    ...queryFilter,
    ...categoryFilter,
    ...mainCategoryFilter,
    ...tagFilter,
    ...priceFilter,
    ...ratingFilter,
  })

  return {
    products: JSON.parse(JSON.stringify(products)) as IProductDoc[],
    totalPages: Math.ceil(countProducts / limit),
    totalProducts: countProducts,
    from: skipAmount + 1,
    to: skipAmount + products.length,
  }
}

export async function updateProductMarkup(
  id: string,
  defaultMarkups: MarkupPatch
): Promise<{ success: boolean; message: string }> {
  try {
    await connectToDatabase()
    const product = await ERPProductModel.findById(id)
    if (!product) throw new Error('Produs inexistent.')

    await ERPProductModel.findByIdAndUpdate(
      id,
      { defaultMarkups },
      { new: true }
    )

    revalidatePath('/admin/products')
    return { success: true, message: 'Marja actualizata cu succes.' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

export async function updateProductAveragePurchasePrice(productId: string) {
  // Calculăm cel mai mare cost din stocul curent
  const highestCost = await getGlobalHighestCostInStock(productId)

  // Actualizăm câmpul pe documentul de produs
  await ERPProductModel.findByIdAndUpdate(productId, {
    averagePurchasePrice: highestCost,
  })

  console.log(
    `Updated averagePurchasePrice for product ${productId} to HIGHEST cost: ${highestCost}`
  )
}

// For Orders
export async function searchStockableItems(
  searchTerm: string
): Promise<SearchedProduct[]> {
  try {
    await connectToDatabase()
    if (!searchTerm || searchTerm.trim().length < 2) return []

    const searchRegex = { $regex: searchTerm, $options: 'i' }
    const matchQuery = {
      $or: [{ name: searchRegex }, { productCode: searchRegex }],
      isPublished: true,
    }

    const [products, packagings] = await Promise.all([
      // Căutare Produse
      ERPProductModel.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'inventoryitems',
            let: { productId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$stockableItem', '$$productId'] } } },
              {
                $group: {
                  _id: '$stockableItem',
                  totalStock: { $sum: '$totalStock' },
                  totalReserved: { $sum: '$quantityReserved' },
                },
              },
            ],
            as: 'inventorySummary',
          },
        },
        // Extragem sumarul (primul element din array sau null)
        { $addFields: { inventoryDoc: { $first: '$inventorySummary' } } },
        {
          $project: {
            _id: 1,
            name: 1,
            productCode: 1,
            image: { $first: '$images' },
            itemType: 'ERPProduct',
            unit: 1,
            packagingUnit: 1,
            packagingQuantity: 1,
            itemsPerPallet: 1,
            totalStock: { $ifNull: ['$inventoryDoc.totalStock', 0] },
            totalReserved: { $ifNull: ['$inventoryDoc.totalReserved', 0] },
            availableStock: {
              $subtract: [
                { $ifNull: ['$inventoryDoc.totalStock', 0] },
                { $ifNull: ['$inventoryDoc.totalReserved', 0] },
              ],
            },
            packagingOptions: {
              $filter: {
                input: [
                  {
                    $cond: [
                      {
                        $and: [
                          '$packagingUnit',
                          { $gt: ['$packagingQuantity', 0] },
                        ],
                      },
                      {
                        unitName: '$packagingUnit',
                        baseUnitEquivalent: '$packagingQuantity',
                      },
                      null,
                    ],
                  },
                  {
                    $cond: {
                      if: {
                        $and: [
                          { $gt: ['$itemsPerPallet', 0] },
                          { $gt: ['$packagingQuantity', 0] },
                        ],
                      },
                      then: {
                        unitName: 'palet',
                        baseUnitEquivalent: {
                          $multiply: ['$itemsPerPallet', '$packagingQuantity'],
                        },
                      },
                      else: {
                        $cond: [
                          { $gt: ['$itemsPerPallet', 0] },
                          {
                            unitName: 'palet',
                            baseUnitEquivalent: '$itemsPerPallet',
                          },
                          null,
                        ],
                      },
                    },
                  },
                ],
                as: 'option',
                cond: { $ne: ['$$option', null] },
              },
            },
          },
        },
      ]),
      PackagingModel.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'inventoryitems',
            let: { packagingId: '$_id' },
            pipeline: [
              {
                $match: { $expr: { $eq: ['$stockableItem', '$$packagingId'] } },
              },
              {
                $group: {
                  _id: '$stockableItem',
                  totalStock: { $sum: '$totalStock' },
                  totalReserved: { $sum: '$quantityReserved' },
                },
              },
            ],
            as: 'inventorySummary',
          },
        },
        { $addFields: { inventoryDoc: { $first: '$inventorySummary' } } },
        {
          $project: {
            _id: 1,
            name: 1,
            productCode: 1,
            image: { $first: '$images' },
            itemType: 'Packaging',
            unit: '$packagingUnit',
            totalStock: { $ifNull: ['$inventoryDoc.totalStock', 0] },
            totalReserved: { $ifNull: ['$inventoryDoc.totalReserved', 0] },
            availableStock: {
              $subtract: [
                { $ifNull: ['$inventoryDoc.totalStock', 0] },
                { $ifNull: ['$inventoryDoc.totalReserved', 0] },
              ],
            },
            packagingOptions: [],
          },
        },
      ]),
    ])

    const combinedResults = [...products, ...packagings].sort(
      (a, b) => (b.totalStock || 0) - (a.totalStock || 0)
    )

    return combinedResults.map((r) => ({
      ...r,
      _id: r._id.toString(),
    })) as SearchedProduct[]
  } catch (error) {
    console.error('Eroare la căutarea produselor și ambalajelor:', error)
    return []
  }
}

export async function calculateMinimumPrice(
  itemId: string,
  deliveryMethodKey: string
): Promise<number> {
  try {
    await connectToDatabase()

    // Căutăm TOATE intrările de inventar pentru acest articol
    const inventoryItems = await InventoryItemModel.find({
      stockableItem: itemId,
    }).lean()

    // Găsim cel mai mare 'maxPurchasePrice' dintre toate locațiile
    const baseCost = inventoryItems.reduce(
      (max, item) => Math.max(max, item.maxPurchasePrice || 0),
      0
    )

    if (baseCost === 0) {
      console.warn(
        `ATENȚIE: Articolul ${itemId} nu are un 'maxPurchasePrice' > 0. Prețul minim va fi 0.`
      )
      return 0
    }

    // Căutăm articolul în ambele colecții și luăm datele de markup
    let itemWithMarkups: ItemWithMarkups | null =
      await ERPProductModel.findById(itemId)
        .select('defaultMarkups')
        .lean<ItemWithMarkups>()

    if (!itemWithMarkups) {
      itemWithMarkups = await PackagingModel.findById(itemId)
        .select('defaultMarkups')
        .lean<ItemWithMarkups>()
    }

    if (!itemWithMarkups) {
      throw new Error(
        'Articolul (produs/ambalaj) nu a fost găsit pentru calculul markup-ului.'
      )
    }

    let markupPercentage = 0
    const markups = itemWithMarkups.defaultMarkups || {}

    switch (deliveryMethodKey) {
      case 'DIRECT_SALE':
        markupPercentage = markups.markupDirectDeliveryPrice || 0
        break
      case 'DELIVERY_FULL_TRUCK':
      case 'DELIVERY_CRANE':
        markupPercentage = markups.markupFullTruckPrice || 0
        break
      case 'DELIVERY_SMALL_VEHICLE_PJ':
        markupPercentage = markups.markupSmallDeliveryBusinessPrice || 0
        break
      case 'RETAIL_SALE_PF':
      case 'PICK_UP_SALE':
      default:
        markupPercentage = markups.markupRetailPrice || 0
    }

    const minimumPrice = baseCost * (1 + markupPercentage / 100)
    return minimumPrice
  } catch (error) {
    console.error('Eroare la calcularea prețului minim:', error)
    return 0
  }
}
export async function getProductForOrderLine(
  productId: string
): Promise<ProductForOrderLine | null> {
  try {
    await connectToDatabase()

    const product = await ERPProductModel.findById(productId).lean()

    if (!product) {
      return null
    }

    const result: ProductForOrderLine = {
      ...product,
      _id: product._id.toString(),
    } as unknown as ProductForOrderLine

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error(
      'Eroare la preluarea datelor de produs pentru comandă:',
      error
    )
    throw new Error('Nu s-au putut prelua datele produsului.')
  }
}
