'use server'

import { auth } from '@/auth'
import { connectToDatabase } from '@/lib/db'
import mongoose from 'mongoose'
import SupplierOrderModel from './supplier-order.model'
import SupplierModel from '../suppliers/supplier.model'
import {
  SupplierOrderCreateInput,
  SupplierOrderUpdateInput,
  SupplierOrderCreateSchema,
  SupplierOrderUpdateSchema,
} from './supplier-order.validator'
import { revalidatePath } from 'next/cache'
import { round2, round6 } from '@/lib/utils'
import { generateSupplierOrderNumber } from '../numbering/numbering.actions'
import {
  ActionResult,
  ActionResultWithData,
  GetOrdersParams,
  ISupplierOrderDoc,
} from './supplier-order.types'
import { VatRateDTO } from '../setting/vat-rate/types'
import { getVatRates } from '../setting/vat-rate/vatRate.actions'
import { PAGE_SIZE } from '@/lib/constants'
import ProductModel, { IERPProductDoc } from '../product/product.model'
import PackagingModel from '../packaging-products/packaging.model'
import { IPackagingDoc } from '../packaging-products/types'
import { ISupplierDoc } from '../suppliers/types'

function processOrderLines(
  itemsFromUI: any[],
  dbItemsMap: Map<string, any>,
  existingItems: any[],
  isPackaging: boolean = false
) {
  let netTotal = 0
  let vatTotal = 0

  const processedIds = new Set()

  const processedItems = itemsFromUI.map((item) => {
    const itemId = isPackaging
      ? item.packaging.toString()
      : item.product.toString()
    processedIds.add(itemId)

    const dbItem = dbItemsMap.get(itemId)

    // 1. Validare existență produs
    if (!dbItem) {
      throw new Error(
        `Articolul cu ID ${itemId} nu mai există în baza de date.`
      )
    }

    // 2. PRELUARE UNITATE DIN DB (Acum va exista după ce rulezi comanda Mongo)
    const dbBaseUnit = dbItem.unit

    if (!dbBaseUnit) {
      throw new Error(
        `Articolul "${dbItem.name}" nu are setată o Unitate de Măsură (câmpul 'unit').`
      )
    }

    // Păstrare istoric recepții
    const existingLine = existingItems.find((oldItem) => {
      const oldId = isPackaging
        ? oldItem.packaging.toString()
        : oldItem.product.toString()
      return oldId === itemId
    })
    const quantityReceived = existingLine
      ? existingLine.quantityReceived || 0
      : 0

    // Date UI
    const userInputQuantity = Number(item.quantityOrdered) || 0
    const userInputPrice = Number(item.pricePerUnit) || 0
    const userInputUM = item.unitMeasure

    let dbQuantity = 0
    let conversionFactor = 1

    // 3. LOGICA DE CONVERSIE
    switch (userInputUM) {
      case dbBaseUnit:
        dbQuantity = userInputQuantity
        conversionFactor = 1
        break

      case dbItem.packagingUnit:
        if (!dbItem.packagingQuantity || dbItem.packagingQuantity <= 0) {
          throw new Error(
            `Articolul "${dbItem.name}" nu are definită cantitatea de ambalare (packagingQuantity).`
          )
        }
        dbQuantity = userInputQuantity * dbItem.packagingQuantity
        conversionFactor = dbItem.packagingQuantity
        break

      case 'palet':
        if (!dbItem.itemsPerPallet || dbItem.itemsPerPallet <= 0) {
          throw new Error(
            `Articolul "${dbItem.name}" nu are definit numărul de bucăți pe palet (itemsPerPallet).`
          )
        }

        const totalBaseUnitsPerPallet = dbItem.packagingQuantity
          ? dbItem.itemsPerPallet * dbItem.packagingQuantity
          : dbItem.itemsPerPallet

        dbQuantity = userInputQuantity * totalBaseUnitsPerPallet
        conversionFactor = totalBaseUnitsPerPallet
        break

      default:
        throw new Error(
          `Unitatea de măsură "${userInputUM}" nu este recunoscută pentru "${dbItem.name}".`
        )
    }

    // Calculăm prețul pe unitatea de bază
    const dbPrice = userInputPrice / conversionFactor

    // 4. VALIDARE STRICTĂ: CANTITATE VS RECEPȚIE
    if (dbQuantity < quantityReceived) {
      throw new Error(
        `Cantitatea calculată pentru "${dbItem.name}" (${dbQuantity} ${dbBaseUnit}) este mai mică decât cantitatea deja recepționată (${quantityReceived} ${dbBaseUnit}).`
      )
    }

    // 5. CALCULE FINANCIARE
    const pricePerUnitRounded = round6(dbPrice)
    const lineTotal = round2(dbQuantity * pricePerUnitRounded)
    const vatValue = round2(lineTotal * (item.vatRate / 100))

    netTotal += lineTotal
    vatTotal += vatValue

    return {
      ...item,
      quantityOrdered: dbQuantity,
      unitMeasure: dbBaseUnit,
      pricePerUnit: pricePerUnitRounded,

      originalQuantity: userInputQuantity,
      originalUnitMeasure: userInputUM,
      originalPricePerUnit: userInputPrice,

      lineTotal,
      vatValue,

      [isPackaging ? 'packagingName' : 'productName']: dbItem.name,
      productCode: dbItem.productCode,

      quantityReceived: quantityReceived,
    }
  })

  // 6. VALIDARE ȘTERGERE
  for (const oldItem of existingItems) {
    const oldId = isPackaging
      ? oldItem.packaging.toString()
      : oldItem.product.toString()
    const oldRec = oldItem.quantityReceived || 0

    if (oldRec > 0 && !processedIds.has(oldId)) {
      const name = isPackaging ? oldItem.packagingName : oldItem.productName
      throw new Error(
        `Nu poți șterge "${name}" din listă deoarece are deja ${oldRec} unități recepționate.`
      )
    }
  }

  return { processedItems, netTotal, vatTotal }
}

// --- CREATE ACTION ---
export async function createSupplierOrder(
  rawData: SupplierOrderCreateInput
): Promise<ActionResultWithData<ISupplierOrderDoc>> {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const userSession = await auth()
    if (!userSession?.user) throw new Error('Utilizator neautentificat.')

    await connectToDatabase()
    const data = SupplierOrderCreateSchema.parse(rawData)

    // 1. Fetch Paralel
    const [supplierDoc, productsData, packagingData] = await Promise.all([
      SupplierModel.findById(data.supplier)
        .session(session)
        .lean<ISupplierDoc>(),
      ProductModel.find({
        _id: { $in: data.products.map((p) => p.product) },
      }).lean<IERPProductDoc[]>(),
      PackagingModel.find({
        _id: { $in: data.packagingItems.map((p) => p.packaging) },
      }).lean<IPackagingDoc[]>(),
    ])

    if (!supplierDoc) throw new Error('Furnizorul nu există.')

    const productsMap = new Map(productsData.map((p) => [p._id.toString(), p]))
    const packagingMap = new Map(
      packagingData.map((p) => [p._id.toString(), p])
    )

    let totalOrderNetValue = 0
    let totalOrderVatValue = 0

    // 2. Procesare Produse
    const processedProducts = data.products.map((item) => {
      const dbProduct = productsMap.get(item.product.toString())
      if (!dbProduct)
        throw new Error(`Produsul ${item.product} nu a fost găsit.`)

      // Convertim explicit la numere pentru a evita erori de calcul
      const userInputQuantity = Number(item.quantityOrdered) || 0
      const userInputPrice = Number(item.pricePerUnit) || 0
      const userInputUM = item.unitMeasure

      let dbQuantity = userInputQuantity
      let dbPrice = userInputPrice
      const dbBaseUnit = dbProduct.unit || userInputUM

      // LOGICA DE CONVERSIE
      if (userInputUM !== dbBaseUnit) {
        if (userInputUM === 'palet') {
          // Fallback la 1 dacă packagingQuantity lipsește, dar itemsPerPallet e obligatoriu
          const itemsPerPallet = dbProduct.itemsPerPallet || 0
          const packagingQty = dbProduct.packagingQuantity || 1

          if (itemsPerPallet > 0) {
            const unitsPerPallet = itemsPerPallet * packagingQty
            dbQuantity = userInputQuantity * unitsPerPallet
            dbPrice = userInputPrice / unitsPerPallet
          }
        } else if (userInputUM === dbProduct.packagingUnit) {
          const packagingQty = dbProduct.packagingQuantity || 1
          dbQuantity = userInputQuantity * packagingQty
          dbPrice = userInputPrice / packagingQty
        }
      }

      const pricePerUnitRounded = round6(dbPrice)
      const lineTotal = round2(dbQuantity * pricePerUnitRounded)
      const vatValue = round2(lineTotal * (item.vatRate / 100))

      totalOrderNetValue += lineTotal
      totalOrderVatValue += vatValue

      return {
        ...item,
        quantityOrdered: dbQuantity,
        unitMeasure: dbBaseUnit,
        pricePerUnit: pricePerUnitRounded,

        // Salvăm valorile originale pentru UI
        originalQuantity: userInputQuantity,
        originalUnitMeasure: userInputUM,
        originalPricePerUnit: userInputPrice,

        lineTotal,
        vatValue,
        productName: dbProduct.name,
        productCode: dbProduct.productCode,
      }
    })

    // 3. Procesare Ambalaje
    const processedPackaging = data.packagingItems.map((item) => {
      const dbPkg = packagingMap.get(item.packaging.toString())
      if (!dbPkg)
        throw new Error(`Ambalajul ${item.packaging} nu a fost găsit.`)

      const userInputQuantity = Number(item.quantityOrdered) || 0
      const userInputPrice = Number(item.pricePerUnit) || 0
      const userInputUM = item.unitMeasure

      const dbQuantity = userInputQuantity
      const dbPrice = userInputPrice
      const dbBaseUnit = userInputUM

      const pricePerUnitRounded = round6(dbPrice)
      const lineTotal = round2(dbQuantity * pricePerUnitRounded)
      const vatValue = round2(lineTotal * (item.vatRate / 100))

      totalOrderNetValue += lineTotal
      totalOrderVatValue += vatValue

      return {
        ...item,
        quantityOrdered: dbQuantity,
        unitMeasure: dbBaseUnit,
        pricePerUnit: pricePerUnitRounded,

        originalQuantity: userInputQuantity,
        originalUnitMeasure: userInputUM,
        originalPricePerUnit: userInputPrice,

        lineTotal,
        vatValue,
        packagingName: dbPkg.name,
        productCode: dbPkg.productCode,
      }
    })

    // 4. Calcul Transport Complet
    let transportData = { ...data.transportDetails } as any // Clone pentru a modifica

    if (data.transportDetails) {
      const transportNet = Number(data.transportDetails.totalTransportCost) || 0
      const transportVatRate =
        Number(data.transportDetails.transportVatRate) || 0

      const transportVatVal = round2(transportNet * (transportVatRate / 100))
      const transportGross = round2(transportNet + transportVatVal)

      // Adăugăm la totalurile generale ale comenzii
      totalOrderNetValue += transportNet
      totalOrderVatValue += transportVatVal

      // Actualizăm obiectul de transport cu noile câmpuri
      transportData = {
        ...data.transportDetails,
        transportCost: Number(data.transportDetails.transportCost) || 0,
        totalTransportCost: transportNet,
        transportVatValue: transportVatVal,
        transportTotalWithVat: transportGross, 
      }
    } else {
      // Fallback object
      transportData = {
        transportType: 'INTERN',
        transportCost: 0,
        totalTransportCost: 0,
        transportVatValue: 0,
        transportTotalWithVat: 0,
      }
    }

    const orderNumber = await generateSupplierOrderNumber({ session })

    const newOrder = new SupplierOrderModel({
      ...data,
      orderNumber,
      supplierOrderNumber: data.supplierOrderNumber,
      supplierOrderDate: data.supplierOrderDate,
      supplierSnapshot: {
        name: supplierDoc.name,
        cui: supplierDoc.fiscalCode,
        regCom: supplierDoc.regComNumber,
        address: supplierDoc.address,
        iban: supplierDoc.bankAccountLei?.iban,
        bank: supplierDoc.bankAccountLei?.bankName,
        contactName: supplierDoc.contactName,
        phone: supplierDoc.phone,
      },
      products: processedProducts,
      packagingItems: processedPackaging,
      transportDetails: transportData, 
      totalValue: round2(totalOrderNetValue),
      totalVat: round2(totalOrderVatValue),
      grandTotal: round2(totalOrderNetValue + totalOrderVatValue),
      createdBy: userSession.user.id,
      createdByName: userSession.user.name,
      status: data.status || 'DRAFT',
    })

    await newOrder.save({ session })
    await session.commitTransaction()

    revalidatePath('/admin/procurement/supplier-orders')
    return {
      success: true,
      message: 'Comanda a fost creată.',
      data: JSON.parse(JSON.stringify(newOrder)),
    }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare creare comandă:', error)
    return {
      success: false,
      message: error.message || 'Eroare la creare.',
    }
  } finally {
    session.endSession()
  }
}

// --- UPDATE ACTION ---
export async function updateSupplierOrder(
  rawData: SupplierOrderUpdateInput
): Promise<ActionResultWithData<ISupplierOrderDoc>> {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    await connectToDatabase()
    const { _id, ...updateData } = SupplierOrderUpdateSchema.parse(rawData)

    const existingOrder =
      await SupplierOrderModel.findById(_id).session(session)
    if (!existingOrder) throw new Error('Comanda nu există.')

    // 1. Fetch Dependencies (Produse & Ambalaje)
    const [productsData, packagingData] = await Promise.all([
      ProductModel.find({
        _id: { $in: (updateData.products || []).map((p) => p.product) },
      }).lean<IERPProductDoc[]>(),
      PackagingModel.find({
        _id: { $in: (updateData.packagingItems || []).map((p) => p.packaging) },
      }).lean<IPackagingDoc[]>(),
    ])

    const productsMap = new Map(productsData.map((p) => [p._id.toString(), p]))
    const packagingMap = new Map(
      packagingData.map((p) => [p._id.toString(), p])
    )

    // 2. Procesăm Produsele folosind Helper-ul
    // Aici se face calculul, validarea și păstrarea quantityReceived
    const productsResult = processOrderLines(
      updateData.products || [],
      productsMap,
      existingOrder.products, // Pasăm produsele vechi pentru istoric
      false // isPackaging = false
    )

    // 3. Procesăm Ambalajele folosind Helper-ul
    const packagingResult = processOrderLines(
      updateData.packagingItems || [],
      packagingMap,
      existingOrder.packagingItems, // Pasăm ambalajele vechi
      true // isPackaging = true
    )

    // Calculăm totalurile parțiale
    let totalOrderNetValue = productsResult.netTotal + packagingResult.netTotal
    let totalOrderVatValue = productsResult.vatTotal + packagingResult.vatTotal

    // 4. Calcul Transport Complet (LA UPDATE)
    // Păstrăm logica de transport aici, e specifică
    let transportData = {
      ...existingOrder.transportDetails,
      ...updateData.transportDetails,
    } as any

    if (updateData.transportDetails) {
      const transportNet =
        Number(updateData.transportDetails.totalTransportCost) || 0
      const transportVatRate =
        Number(updateData.transportDetails.transportVatRate) || 0

      const transportVatVal = round2(transportNet * (transportVatRate / 100))
      const transportGross = round2(transportNet + transportVatVal)

      // Adăugăm transportul la totaluri
      totalOrderNetValue += transportNet
      totalOrderVatValue += transportVatVal

      transportData = {
        ...updateData.transportDetails,
        transportCost: Number(updateData.transportDetails.transportCost) || 0,
        totalTransportCost: transportNet,
        transportVatValue: transportVatVal,
        transportTotalWithVat: transportGross,
      }
    }

    // 5. Salvare Update
    existingOrder.set({
      ...updateData,
      products: productsResult.processedItems, // Lista curată și validată
      packagingItems: packagingResult.processedItems, // Lista curată și validată
      transportDetails: transportData,
      totalValue: round2(totalOrderNetValue),
      totalVat: round2(totalOrderVatValue),
      grandTotal: round2(totalOrderNetValue + totalOrderVatValue),
      status: updateData.status ?? existingOrder.status,
    })

    await existingOrder.save({ session })
    await session.commitTransaction()

    revalidatePath('/admin/management/supplier-orders')
    revalidatePath(`/admin/management/supplier-orders/${_id}`)

    return {
      success: true,
      message: 'Comanda a fost actualizată.',
      data: JSON.parse(JSON.stringify(existingOrder)),
    }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare update comandă:', error)
    return {
      success: false,
      message: error.message || 'Eroare la update.',
    }
  } finally {
    session.endSession()
  }
}

// --- GET BY ID ---
export async function getSupplierOrderById(
  id: string
): Promise<ISupplierOrderDoc | null> {
  try {
    await connectToDatabase()

    const _p = ProductModel
    const _pkg = PackagingModel

    const order = await SupplierOrderModel.findById(id)
      .populate('supplier', 'name')
      .populate({
        path: 'products.product',
        model: ProductModel,
        select:
          'name productCode unit packagingUnit packagingQuantity itemsPerPallet',
      })
      .populate({
        path: 'packagingItems.packaging',
        model: PackagingModel,
        select:
          'name productCode unit packagingUnit packagingQuantity itemsPerPallet',
      })
      .lean()

    if (!order) return null
    return JSON.parse(JSON.stringify(order))
  } catch (error) {
    console.error('Eroare getSupplierOrderById:', error)
    return null
  }
}

// --- DELETE ---
export async function deleteSupplierOrder(id: string): Promise<ActionResult> {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    await connectToDatabase()
    const order = await SupplierOrderModel.findById(id).session(session)

    if (!order) throw new Error('Comanda nu există.')
    if (order.status !== 'DRAFT') {
      throw new Error('Doar comenzile Ciornă pot fi șterse.')
    }

    await SupplierOrderModel.findByIdAndDelete(id).session(session)
    await session.commitTransaction()

    revalidatePath('/admin/procurement/supplier-orders')
    return { success: true, message: 'Comanda a fost ștearsă.' }
  } catch (error: any) {
    await session.abortTransaction()
    return { success: false, message: error.message }
  } finally {
    session.endSession()
  }
}

// --- GET ALL ---
export async function getAllSupplierOrders({
  page = 1,
  limit = PAGE_SIZE,
  status,
  q,
}: GetOrdersParams) {
  await connectToDatabase()

  const skip = (page - 1) * limit
  const query: any = {} 

  // 1. Filtru Status
  if (status && status !== 'ALL') {
    query.status = status
  }

  // 2. Filtru Căutare
  if (q && q.trim() !== '') {
    const searchRegex = new RegExp(q, 'i')
    query.$or = [
      { supplierOrderNumber: searchRegex },
      { orderNumber: searchRegex },
    ]
  }

  try {
    const [data, total] = await Promise.all([
      SupplierOrderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('supplier', 'name')
        .lean(),
      SupplierOrderModel.countDocuments(query),
    ])

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return {
      success: false,
      data: [],
      pagination: { currentPage: 1, totalPages: 0, totalItems: 0 },
    }
  }
}

// --- INITIAL DATA ---
export async function getSupplierOrderFormInitialData() {
  try {
    const vatRatesResult = await getVatRates()
    const vatRates =
      vatRatesResult.success && vatRatesResult.data
        ? (vatRatesResult.data as VatRateDTO[])
        : []

    return {
      success: true,
      data: {
        vatRates,
      },
    }
  } catch (error) {
    console.error('Eroare date inițiale formular comenzi furnizor:', error)
    return {
      success: false,
      data: { vatRates: [] },
    }
  }
}

// --- CANCEL ---
export async function cancelSupplierOrder(id: string): Promise<ActionResult> {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    await connectToDatabase()
    const order = await SupplierOrderModel.findById(id).session(session)

    if (!order) throw new Error('Comanda nu există.')

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new Error('Comanda este deja finalizată sau anulată.')
    }

    order.status = 'CANCELLED'
    await order.save({ session })

    await session.commitTransaction()

    revalidatePath('/admin/management/supplier-orders')
    return { success: true, message: 'Comanda a fost anulată.' }
  } catch (error: any) {
    await session.abortTransaction()
    return { success: false, message: error.message }
  } finally {
    session.endSession()
  }
}

// --- GET SUPPLIER ---
export async function getFullSupplierDetails(id: string) {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(id)) return null

    const supplier = await SupplierModel.findById(id)
      .select('name loadingAddresses address contactName phone email')
      .lean()

    if (!supplier) return null
    return JSON.parse(JSON.stringify(supplier))
  } catch (error) {
    console.error('Eroare la preluarea detaliilor furnizorului:', error)
    return null
  }
}
export async function confirmSupplierOrderAction(
  id: string
): Promise<ActionResult> {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    await connectToDatabase()
    const order = await SupplierOrderModel.findById(id).session(session)

    if (!order) throw new Error('Comanda nu există.')
    if (order.status !== 'DRAFT') {
      throw new Error('Doar comenzile în stadiul Ciornă pot fi confirmate.')
    }

    order.status = 'CONFIRMED'
    await order.save({ session })
    await session.commitTransaction()

    revalidatePath('/admin/management/supplier-orders')
    return { success: true, message: 'Comanda a fost confirmată cu succes.' }
  } catch (error: any) {
    await session.abortTransaction()
    return { success: false, message: error.message }
  } finally {
    session.endSession()
  }
}
