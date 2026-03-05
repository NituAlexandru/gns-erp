'use server'

import { ClientSession, startSession, Types } from 'mongoose'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import { FifoCostInfo, ICostBreakdownBatch } from './types'
import { StockMovementInput, StockMovementSchema } from './validator'
import { IN_TYPES, OUT_TYPES } from './constants'
import InventoryItemModel, {
  IInventoryBatch,
  IInventoryItemDoc,
} from './inventory.model'
import User from '../user/user.model'
import ArchivedBatchModel from './archived-batch.model'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '../..'
import ReceptionModel from '../reception/reception.model'
import ERPProductModel from '../product/product.model'
import PackagingModel from '../packaging-products/packaging.model'

/**
 * Înregistrează o mișcare de stoc (IN/OUT) conform logicii FIFO.
 * Gestionează adăugarea și consumarea de loturi.
 * Câmpurile `locationTo` și `locationFrom` pot fi locații predefinite (ex: 'DEPOZIT')
 * sau ID-ul unui Proiect, pentru gestiunea stocurilor pe proiecte.
 * Această operație este tranzacțională.
 *
 * 🔽 --- Returnează acum un obiect complex --- 🔽
 * @returns {Promise<{ movement: IStockMovementDoc, costInfo: FifoCostInfo | null }>}
 * Documentul de mișcare creat și (dacă e ieșire) costul FIFO calculat.
 */

export async function recordStockMovement(
  input: StockMovementInput,
  existingSession?: ClientSession,
): Promise<{ movement: IStockMovementDoc; costInfo: FifoCostInfo | null }> {
  // console.log('   [STOCK-DEBUG] 1. Start recordStockMovement')
  const payload = StockMovementSchema.parse(input)

  const executeLogic = async (session: ClientSession) => {
    //  Pregătire date denormalizate (Cache) ---
    let finalItemName = payload.itemName || ''
    let finalItemCode = payload.itemCode || ''
    let finalUnitMeasure = payload.unitMeasure || '-'

    // Dacă nu au fost trimise prin payload, le căutăm noi acum (Safety Check)
    if (!finalItemName && session) {
      // console.log('   [STOCK-DEBUG] 2.1 Missing name, fetching product...')
      if (payload.stockableItemType === 'ERPProduct') {
        const prod = await ERPProductModel.findById(payload.stockableItem)
          .select('name productCode unit')
          .session(session)
        if (prod) {
          finalItemName = prod.name
          finalItemCode = prod.productCode || ''
          if (finalUnitMeasure === '-' || !finalUnitMeasure)
            finalUnitMeasure = prod.unit
        }
      } else {
        const pkg = await PackagingModel.findById(payload.stockableItem)
          .select('name productCode packagingUnit')
          .session(session)
        if (pkg) {
          finalItemName = pkg.name
          finalItemCode = pkg.productCode || ''
          if (finalUnitMeasure === '-' || !finalUnitMeasure)
            finalUnitMeasure = pkg.packagingUnit
        }
      }
    }

    let isInput: boolean
    if (IN_TYPES.has(payload.movementType)) {
      isInput = true
    } else if (OUT_TYPES.has(payload.movementType)) {
      isInput = false
    } else {
      throw new Error(
        `Tipul de mișcare '${payload.movementType}' este necunoscut.`,
      )
    }

    const auditLocation = isInput ? payload.locationTo : payload.locationFrom
    if (!auditLocation) {
      throw new Error('Locația (To/From) lipsește pentru acest tip de mișcare.')
    }
    console.log('   [STOCK-DEBUG] 3. Caut Inventory Item...')
    let inventoryItem = await InventoryItemModel.findOne({
      stockableItem: payload.stockableItem,
      stockableItemType: payload.stockableItemType,
      location: auditLocation,
    }).session(session)

    if (!inventoryItem) {
      // console.log('   [STOCK-DEBUG] 3.1 Item nu exista, creez unul nou...')
      inventoryItem = new InventoryItemModel({
        stockableItem: payload.stockableItem,
        searchableName: finalItemName,
        searchableCode: finalItemCode,
        unitMeasure: finalUnitMeasure,
        stockableItemType: payload.stockableItemType,
        location: auditLocation,
        batches: [],
        totalStock: 0,
        quantityReserved: 0,
      })
    } else {
      // Dacă există, facem update "lazy" dacă lipsesc datele sau s-au schimbat
      // (Suprascriem mereu pentru a ține cache-ul proaspăt)
      inventoryItem.searchableName = finalItemName
      inventoryItem.searchableCode = finalItemCode
      inventoryItem.unitMeasure = finalUnitMeasure
    }

    const balanceBefore = inventoryItem.totalStock || 0
    let balanceAfter = balanceBefore

    let responsibleUserName = 'Sistem'
    if (payload.responsibleUser) {
      // console.log('   [STOCK-DEBUG] 4. Fetch User...')
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
      supplierId: payload.supplierId
        ? new Types.ObjectId(payload.supplierId)
        : undefined,
      supplierName: payload.supplierName,
      clientId: payload.clientId
        ? new Types.ObjectId(payload.clientId)
        : undefined,
      documentNumber: payload.documentNumber,
      balanceBefore,
      balanceAfter: 0,
      receptionRef: payload.receptionRef
        ? new Types.ObjectId(payload.receptionRef)
        : undefined,
      orderRef: payload.orderRef
        ? new Types.ObjectId(payload.orderRef)
        : undefined,
      supplierOrderNumber: payload.supplierOrderNumber,
      salePrice: payload.salePrice,
    })

    let costInfo: FifoCostInfo | null = null
    // console.log('   [STOCK-DEBUG] 5. Calcul FIFO/Batches...')
    if (isInput) {
      if (payload.unitCost === undefined) {
        throw new Error(
          'Costul unitar este obligatoriu pentru mișcările de intrare.',
        )
      }
      const supplierIdObj = payload.supplierId
        ? new Types.ObjectId(payload.supplierId)
        : undefined

      inventoryItem.batches.push({
        _id: new Types.ObjectId(),
        quantity: payload.quantity,
        unitCost: payload.unitCost,
        entryDate: payload.timestamp ?? new Date(),
        movementId: movement._id as Types.ObjectId,
        supplierId: supplierIdObj,
        supplierName: payload.supplierName,
        qualityDetails: payload.qualityDetails,
        receptionRef: payload.receptionRef
          ? new Types.ObjectId(payload.receptionRef)
          : undefined,
        orderRef: payload.orderRef
          ? new Types.ObjectId(payload.orderRef)
          : undefined,
        supplierOrderNumber: payload.supplierOrderNumber,
      })

      movement.supplierId = supplierIdObj
      movement.qualityDetails = payload.qualityDetails
      movement.unitCost = payload.unitCost
      movement.lineCost = payload.quantity * payload.unitCost

      balanceAfter = balanceBefore + payload.quantity
      inventoryItem.totalStock = balanceAfter
      inventoryItem.lastPurchasePrice = payload.unitCost
    } else {
      let quantityToDecrease = payload.quantity
      const fallbackCost = inventoryItem.lastPurchasePrice || 0

      const newBatches: IInventoryBatch[] = []
      const costBreakdown: ICostBreakdownBatch[] = []
      let lineCostFIFO = 0

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
          type: 'REAL',
          supplierId: batch.supplierId,
          supplierName: batch.supplierName,
          qualityDetails: batch.qualityDetails,
        })

        if (batch.quantity > consumedQuantity) {
          newBatches.push({
            _id: batch._id,
            quantity: batch.quantity - consumedQuantity,
            unitCost: batch.unitCost,
            entryDate: batch.entryDate,
            movementId: batch.movementId,
            supplierId: batch.supplierId,
            qualityDetails: batch.qualityDetails,
          })
          quantityToDecrease = 0
        } else {
          quantityToDecrease -= batch.quantity

          await ArchivedBatchModel.create(
            [
              {
                originalItemId: inventoryItem._id,
                stockableItem: inventoryItem.stockableItem,
                stockableItemType: inventoryItem.stockableItemType,
                location: inventoryItem.location,
                quantityOriginal: batch.quantity,
                unitCost: batch.unitCost,
                entryDate: batch.entryDate,
                movementId: batch.movementId,
                supplierId: batch.supplierId,
                qualityDetails: batch.qualityDetails,
                archivedAt: new Date(),
              },
            ],
            { session },
          )
        }
      }
      inventoryItem.batches = newBatches

      // Dacă a mai rămas cantitate nesatisfăcută din loturi (adică intrăm pe stoc negativ / vindem în gol)
      if (quantityToDecrease > 0) {
        // 1. Încercăm fallback-ul local (lastPurchasePrice)
        let currentFallbackCost = inventoryItem.lastPurchasePrice || 0

        // 2. Dacă e 0 (nu a avut recepții pe această locație), căutăm SURSA DE ADEVĂR GLOBALĂ
        if (currentFallbackCost === 0) {
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

          // Căutăm cel mai mare preț de intrare din ultimul an, pe TOATE gestiunile, pentru acest produs
          const globalMaxResult = await StockMovementModel.aggregate([
            {
              $match: {
                stockableItem: new Types.ObjectId(payload.stockableItem),
                movementType: { $in: Array.from(IN_TYPES) }, // Doar intrări
                status: 'ACTIVE',
                unitCost: { $gt: 0 },
                timestamp: { $gte: oneYearAgo },
              },
            },
            {
              $group: {
                _id: null,
                maxCost: { $max: '$unitCost' },
              },
            },
          ]).session(session)

          // Dacă găsim un preț istoric global, îl folosim
          if (globalMaxResult && globalMaxResult.length > 0) {
            currentFallbackCost = globalMaxResult[0].maxCost
          }
        }

        // 3. Calculăm costul liniei cu prețul găsit (care acum este foarte sigur că nu e 0)
        const negativeStockCost = quantityToDecrease * currentFallbackCost
        lineCostFIFO += negativeStockCost

        // 4. Îl salvăm ca PROVISIONAL pentru transparență
        costBreakdown.push({
          entryDate: new Date(),
          quantity: quantityToDecrease,
          unitCost: currentFallbackCost,
          type: 'PROVISIONAL',
        })
      }

      const unitCostFIFO =
        payload.quantity > 0 ? lineCostFIFO / payload.quantity : 0

      movement.unitCost = unitCostFIFO
      movement.lineCost = lineCostFIFO
      movement.costBreakdown = costBreakdown

      costInfo = {
        unitCostFIFO,
        lineCostFIFO,
        costBreakdown,
      }

      balanceAfter = balanceBefore - payload.quantity
      inventoryItem.totalStock = balanceAfter
    }

    // console.log('   [STOCK-DEBUG] 6. Recalculez sumar...')
    await recalculateInventorySummary(inventoryItem, session)
    // console.log('   [STOCK-DEBUG] 7. Salvez InventoryItem...')
    await inventoryItem.save({ session })

    movement.balanceAfter = inventoryItem.totalStock
    // console.log('   [STOCK-DEBUG] 8. Salvez Movement...')
    await movement.save({ session })
    // console.log('   [STOCK-DEBUG] 9. Gata recordStockMovement!')
    return { movement, costInfo }
  }

  // ---  APELAREA FUNCȚIEI ---
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
  session: ClientSession,
) {
  // 1. Căutăm mișcările (Păstrăm lista ta de tipuri exact așa cum ai cerut)
  const movementsToReverse = await StockMovementModel.find({
    referenceId,
    movementType: {
      $in: [
        'RECEPTIE',
        'DIRECT_SALE',
        'DELIVERY_FULL_TRUCK',
        'DELIVERY_CRANE',
        'DELIVERY_SMALL_VEHICLE_PJ',
        'RETAIL_SALE_PF',
        'PICK_UP_SALE',
      ],
    },
    status: 'ACTIVE',
  }).session(session)

  if (movementsToReverse.length === 0) {
    console.warn(
      `[REVOC] Nu au fost găsite mișcări ACTIVE pentru referința ${referenceId}.`,
    )
    return
  }

  for (const movement of movementsToReverse) {
    const movementIdStr = String(movement._id)
    const isReceptie = movement.movementType === 'RECEPTIE'

    // 2. Găsim InventoryItem folosind locația corectă (To pentru recepții, From pentru vânzări)
    const inventoryItem = await InventoryItemModel.findOne({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      location: isReceptie ? movement.locationTo : movement.locationFrom,
    }).session(session)

    if (!inventoryItem) {
      throw new Error(`Articolul de inventar nu a fost găsit în locația sursă.`)
    }

    // =============================================================
    // 🟢 START LOGICĂ PROTEJATĂ
    // =============================================================
    if (isReceptie) {
      const batchIndex = inventoryItem.batches.findIndex(
        (b) => String(b.movementId) === movementIdStr,
      )

      if (batchIndex === -1) {
        throw new Error(
          `Nu se poate anula recepția. Lotul a fost deja epuizat complet.`,
        )
      }

      const batch = inventoryItem.batches[batchIndex]

      if (batch.quantity < movement.quantity) {
        throw new Error(
          `Nu se poate anula recepția. Din articolul ${movement.stockableItem} s-au vândut deja produse. ` +
            `(Stoc Rămas: ${batch.quantity}, Stoc Inițial: ${movement.quantity}). ` +
            `Trebuie să faceți retur la vânzări înainte de a anula recepția.`,
        )
      }

      // Ștergem lotul (doar pentru recepții)
      inventoryItem.batches.splice(batchIndex, 1)
    } else {
      // CAZ NOU: ANULARE LIVRARE (REINTRODUCERE ÎN LOTURI)
      if (movement.costBreakdown && movement.costBreakdown.length > 0) {
        for (const breakdown of movement.costBreakdown) {
          const existingBatch = inventoryItem.batches.find(
            (b) => String(b.movementId) === String(breakdown.movementId),
          )

          if (existingBatch) {
            existingBatch.quantity += breakdown.quantity
          } else {
            const safeMovementId = breakdown.movementId || new Types.ObjectId()
            // Re-creăm lotul dacă a fost epuizat între timp
            inventoryItem.batches.push({
              _id: new Types.ObjectId(),
              quantity: breakdown.quantity,
              unitCost: breakdown.unitCost,
              entryDate: breakdown.entryDate,
              movementId: safeMovementId as Types.ObjectId,
              supplierId: breakdown.supplierId,
              supplierName: breakdown.supplierName,
              qualityDetails: breakdown.qualityDetails,
            })
          }
        }
      }
    }

    // 3. Recalculăm și salvăm
    await recalculateInventorySummary(inventoryItem)
    await inventoryItem.save({ session })

    // 4. Creăm mișcarea de audit (Dinamica: ANULARE_RECEPTIE vs ANULARE_AVIZ)
    const reversalMovement = new StockMovementModel({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      movementType: isReceptie ? 'ANULARE_RECEPTIE' : 'ANULARE_AVIZ',
      quantity: movement.quantity,
      unitMeasure: movement.unitMeasure,
      responsibleUser: movement.responsibleUser,
      locationFrom: movement.locationTo,
      locationTo: movement.locationFrom,
      referenceId,
      note: `Anulare automată mișcare ${movement.movementType} (${movementIdStr})`,
      timestamp: new Date(),
      // Calculăm balanța corect: recepția scade stocul la anulare (+), livrarea îl crește (-)
      balanceBefore:
        inventoryItem.totalStock +
        (isReceptie ? movement.quantity : -movement.quantity),
      balanceAfter: inventoryItem.totalStock,
      supplierId: movement.supplierId,
      supplierName: movement.supplierName,
      qualityDetails: movement.qualityDetails,
    })
    await reversalMovement.save({ session })

    // 5. Marcăm mișcarea originală ca anulată
    movement.status = 'CANCELLED'
    await movement.save({ session })
  }
}
export async function recalculateInventorySummary(
  item: IInventoryItemDoc,
  session?: ClientSession,
) {
  if (!item) return

  // Păstrat codul tău de sortare:
  item.batches.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime())

  // Calculăm suma loturilor fizice existente
  const batchesSum = item.batches.reduce(
    (sum, batch) => sum + batch.quantity,
    0,
  )

  // 1. Dacă avem loturi fizice, stocul total se aliniază cu ele.
  if (batchesSum > 0) {
    item.totalStock = batchesSum
  }
  // 2. Dacă NU avem loturi (suma e 0), dar stocul figurează POZITIV, îl punem pe 0 (corecție).
  else if (batchesSum === 0 && item.totalStock > 0) {
    item.totalStock = 0
  }
  // 3. IMPORTANT: Dacă item.totalStock < 0 (NEGATIV), NU facem nimic.
  // Îl lăsăm așa cum a fost calculat (ex: -5), nu îl suprascriem cu batchesSum (0).

  // ------------------------------------------------

  // Actualizăm prețurile DOAR dacă există stoc POZITIV și loturi.
  if (item.totalStock > 0 && item.batches.length > 0) {
    let totalValue = 0
    let maxPrice = 0
    let minPrice = Infinity

    for (const batch of item.batches) {
      totalValue += batch.quantity * batch.unitCost
      if (batch.unitCost > maxPrice) maxPrice = batch.unitCost
      if (batch.unitCost < minPrice) minPrice = batch.unitCost
    }

    item.averageCost = totalValue / item.totalStock
    item.maxPurchasePrice = maxPrice
    item.minPurchasePrice = minPrice === Infinity ? 0 : minPrice

    // Setăm lastPurchasePrice DOAR dacă avem loturi.
    item.lastPurchasePrice = item.batches[item.batches.length - 1].unitCost
  } else if (item.totalStock <= 0) {
    // Stocul e 0 sau negativ. Resetăm DOAR costurile de medie.
    item.averageCost = 0
    item.maxPurchasePrice = 0
    item.minPurchasePrice = 0
    // NU ATINGEM item.lastPurchasePrice. Acesta trebuie să persiste.
  }
  // =====================================================================
  // 🟢 Actualizare Preț Maxim în Produsul Părinte (Global)
  // =====================================================================

  // 1. Calculăm noul preț maxim global
  const globalMaxResult = await InventoryItemModel.aggregate([
    { $match: { stockableItem: item.stockableItem } },
    { $group: { _id: null, maxGlobal: { $max: '$maxPurchasePrice' } } },
  ]).session(session || null)

  const currentLocalMax = item.maxPurchasePrice || 0
  const otherLocationsMax = globalMaxResult[0]?.maxGlobal || 0
  const finalMaxPrice = Math.max(currentLocalMax, otherLocationsMax)

  // 2. Facem update DOAR la produsul/ambalajul vizat
  // Folosim findByIdAndUpdate care este foarte rapid
  if (item.stockableItemType === 'ERPProduct') {
    // Putem adăuga o verificare să nu scriem dacă prețul e același,
    // dar MongoDB e oricum smart și nu "suferă" de la un update redundant.
    await ERPProductModel.findByIdAndUpdate(
      item.stockableItem,
      {
        averagePurchasePrice: finalMaxPrice,
      },
      { session },
    )
  } else if (item.stockableItemType === 'Packaging') {
    await PackagingModel.findByIdAndUpdate(
      item.stockableItem,
      {
        averagePurchasePrice: finalMaxPrice,
      },
      { session },
    )
  }
}
export async function updateBatchDetails(
  inventoryItemId: string,
  batchMovementId: string,
  qualityDetails: {
    lotNumbers: string[]
    certificateNumbers: string[]
    testReports: string[]
    additionalNotes: string
  },
) {
  try {
    await connectToDatabase()

    const item = await InventoryItemModel.findById(inventoryItemId)
    if (!item) throw new Error('Articolul din inventar nu a fost găsit.')

    // (Loturile nu au _id, dar au garantat un movementId unic)
    const batch = item.batches.find(
      (b: IInventoryBatch) => b.movementId.toString() === batchMovementId,
    )

    if (!batch) throw new Error('Lotul nu a fost găsit.')

    // Actualizăm doar detaliile de calitate
    batch.qualityDetails = qualityDetails

    item.markModified('batches')

    await item.save()

    const movement = await StockMovementModel.findById(batchMovementId)
    if (movement) {
      movement.qualityDetails = qualityDetails
      await movement.save()

      // 3. Propagăm modificarea înapoi în RECEPȚIE (DOCUMENTUL SURSĂ)
      if (movement.movementType === 'RECEPTIE' && movement.referenceId) {
        const receptionId = movement.referenceId

        // Trebuie să știm dacă e produs sau ambalaj ca să știm ce array actualizăm în recepție
        if (item.stockableItemType === 'ERPProduct') {
          await ReceptionModel.updateOne(
            {
              _id: receptionId,
              'products.product': item.stockableItem,
            },
            {
              $set: { 'products.$.qualityDetails': qualityDetails },
            },
          )
        } else if (item.stockableItemType === 'Packaging') {
          await ReceptionModel.updateOne(
            {
              _id: receptionId,
              'packagingItems.packaging': item.stockableItem,
            },
            {
              $set: { 'packagingItems.$.qualityDetails': qualityDetails },
            },
          )
        }
      }
    }

    // Revalidăm toate căile posibile
    revalidatePath('/admin/management/inventory/stock')
    revalidatePath(
      `/admin/management/inventory/stock/details/${item.stockableItem}`,
    )
    revalidatePath('/admin/management/receptions') // Revalidăm și recepțiile

    return {
      success: true,
      message: 'Detaliile au fost actualizate în Stoc, Istoric și Recepție.',
    }
  } catch (error) {
    console.error('Error updating batch details:', error)
    return { success: false, message: 'Eroare la actualizare.' }
  }
}
