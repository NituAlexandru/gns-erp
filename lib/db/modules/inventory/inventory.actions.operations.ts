'use server'

import { startSession, Types } from 'mongoose'
import {
  AddInitialStockInput,
  addInitialStockSchema,
  AdjustStockInput,
  adjustStockSchema,
  TransferStockInput,
  transferStockSchema,
} from './validator'
import InventoryItemModel from './inventory.model'
import StockMovementModel from './movement.model'
import ArchivedBatchModel from './archived-batch.model'
import { IN_TYPES, LOCATION_NAMES_MAP, OUT_TYPES } from './constants'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'
import { recalculateInventorySummary } from './inventory.actions.core'
import { auth } from '@/auth'
import PackagingModel from '../packaging-products/packaging.model'
import ERPProductModel from '../product/product.model'
import SupplierModel from '../suppliers/supplier.model'
import ReceptionModel from '../reception/reception.model'
/**
 * Transferă o cantitate dintr-un lot specific dintr-o locație în alta.
 * Operațiunea este atomică (folosește tranzacție).
 * NU folosește FIFO, ci identifică lotul exact după batchId.
 */
export async function transferStock(input: TransferStockInput) {
  const session = await startSession()
  session.startTransaction()

  try {
    await connectToDatabase()
    const payload = transferStockSchema.parse(input)

    const transferGroupId = new Types.ObjectId()

    const userSession = await auth()
    if (!userSession?.user) {
      throw new Error('Utilizatorul nu este autentificat.')
    }

    // 1. Găsim documentul sursă (InventoryItem)
    const sourceItem = await InventoryItemModel.findById(
      payload.sourceInventoryItemId,
    )
      .populate('stockableItem')
      .session(session)

    if (!sourceItem) {
      throw new Error('Sursa de inventar nu a fost găsită.')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemData = sourceItem.stockableItem as any

    const unitMeasure =
      itemData?.unit || // ERPProduct
      itemData?.packagingUnit || // Packaging
      '-'
    // 2. Găsim lotul specific în array-ul sursă
    const batchIndex = sourceItem.batches.findIndex(
      (b: any) => b._id.toString() === payload.batchId,
    )

    if (batchIndex === -1) {
      throw new Error('Lotul specificat nu a fost găsit în locația sursă.')
    }

    const targetBatch = sourceItem.batches[batchIndex]

    // 3. Verificăm disponibilitatea
    if (targetBatch.quantity < payload.quantity) {
      throw new Error(
        `Cantitate insuficientă în lot. Disponibil: ${targetBatch.quantity}, Solicitat: ${payload.quantity}`,
      )
    }

    // =========================================================================
    // 🟢 START LOGICĂ NOUĂ: GESTIONAREA AVIZELOR MULTIPLE PENTRU RECEPȚIA ORIGINALĂ
    // =========================================================================
    if (
      payload.deliveries &&
      payload.deliveries.length > 0 &&
      targetBatch.receptionRef
    ) {
      const reception = await ReceptionModel.findById(
        targetBatch.receptionRef,
      ).session(session)

      if (reception) {
        // 1. Extragem numerele de aviz deja existente în recepție
        const existingDispatchNumbers = reception.deliveries.map(
          (d) => d.dispatchNoteNumber,
        )

        // 2. Găsim care din avizele trimise acum sunt duplicate
        const duplicateDeliveries = payload.deliveries.filter((d) =>
          existingDispatchNumbers.includes(d.dispatchNoteNumber),
        )

        // 3. Dacă avem MĂCAR UN duplicat și user-ul nu a forțat salvarea -> Trimitem Alerta
        if (
          duplicateDeliveries.length > 0 &&
          !payload.forceBypassDuplicateAviz
        ) {
          await session.abortTransaction()
          session.endSession()

          const dupNumbers = duplicateDeliveries
            .map((d) => d.dispatchNoteNumber)
            .join(', ')
          return {
            success: false,
            requireConfirmation: true,
            message: `Avizele următoare sunt deja adăugate la recepția inițială: ${dupNumbers}. Ești sigur că dorești să transferi stocul fără a le duplica?`,
          }
        }

        // 4. Filtrăm doar avizele NOI (care NU sunt duplicate) pentru a le adăuga efectiv
        const newDeliveriesToAdd = payload.deliveries.filter(
          (d) => !existingDispatchNumbers.includes(d.dispatchNoteNumber),
        )

        // 5. Adăugăm în recepție TOATE avizele noi
        if (newDeliveriesToAdd.length > 0) {
          for (const delivery of newDeliveriesToAdd) {
            reception.deliveries.push({
              ...delivery,
              tertiaryTransporterDetails: delivery.tertiaryTransporterDetails
                ? {
                    ...delivery.tertiaryTransporterDetails,
                    name: delivery.tertiaryTransporterDetails.name || '',
                  }
                : undefined,
            } as any)
          }
          await reception.save({ session })
        }
      }
    }
    // =========================================================================
    // 🔴 FINAL LOGICĂ NOUĂ
    // =========================================================================

    // --- OPERAȚIUNEA DE IEȘIRE (SURSA) ---

    // Salvăm datele lotului înainte să le modificăm (pentru a le copia la destinație)
    const batchSnapshot = {
      unitCost: targetBatch.unitCost,
      supplierId: targetBatch.supplierId,
      supplierName: targetBatch.supplierName,
      qualityDetails: targetBatch.qualityDetails,
      entryDate: targetBatch.entryDate,
      movementId: targetBatch.movementId, // Păstrăm trasabilitatea intrării originale
      receptionRef: targetBatch.receptionRef,
      orderRef: targetBatch.orderRef,
      supplierOrderNumber: targetBatch.supplierOrderNumber,
    }

    // Scădem cantitatea
    if (targetBatch.quantity === payload.quantity) {
      // Se consumă tot -> Arhivăm și ștergem
      await ArchivedBatchModel.create(
        [
          {
            originalItemId: sourceItem._id,
            stockableItem: sourceItem.stockableItem,
            stockableItemType: sourceItem.stockableItemType,
            location: sourceItem.location,
            quantityOriginal: targetBatch.quantity,
            unitCost: targetBatch.unitCost,
            entryDate: targetBatch.entryDate,
            movementId: targetBatch.movementId,
            supplierId: targetBatch.supplierId,
            qualityDetails: targetBatch.qualityDetails,
            archivedAt: new Date(),
            notes: `Transferat integral către ${payload.targetLocation}`,
          },
        ],
        { session },
      )
      // Ștergem din array
      sourceItem.batches.splice(batchIndex, 1)
    } else {
      // Scădem parțial
      targetBatch.quantity -= payload.quantity
    }

    // Recalculăm totalurile pe sursă
    await recalculateInventorySummary(sourceItem)
    await sourceItem.save({ session })

    // Înregistrăm mișcarea de IEȘIRE (Audit)
    await StockMovementModel.create(
      [
        {
          stockableItem: sourceItem.stockableItem,
          stockableItemType: sourceItem.stockableItemType,
          movementType: 'TRANSFER_OUT',
          locationFrom: sourceItem.location,
          locationTo: payload.targetLocation,
          quantity: payload.quantity,
          unitMeasure: unitMeasure,
          responsibleUser: userSession.user.id,
          responsibleUserName: userSession.user.name,
          unitCost: batchSnapshot.unitCost, // Iese cu prețul de intrare
          lineCost: payload.quantity * batchSnapshot.unitCost,
          balanceBefore: sourceItem.totalStock + payload.quantity,
          balanceAfter: sourceItem.totalStock,
          note: `Transfer ieșire din gestiune - ${LOCATION_NAMES_MAP[sourceItem.location as keyof typeof LOCATION_NAMES_MAP] || sourceItem.location}`,
          referenceId: transferGroupId,
          supplierId: batchSnapshot.supplierId,
          supplierName: batchSnapshot.supplierName,
          qualityDetails: batchSnapshot.qualityDetails,
          timestamp: new Date(),
        },
      ],
      { session },
    )

    // --- OPERAȚIUNEA DE INTRARE (DESTINAȚIA) ---

    // Căutăm sau creăm item-ul de inventar pentru destinație
    let destItem = await InventoryItemModel.findOne({
      stockableItem: sourceItem.stockableItem,
      stockableItemType: sourceItem.stockableItemType,
      location: payload.targetLocation,
    }).session(session)

    if (!destItem) {
      destItem = new InventoryItemModel({
        stockableItem: sourceItem.stockableItem,
        stockableItemType: sourceItem.stockableItemType,
        searchableName: sourceItem.searchableName,
        searchableCode: sourceItem.searchableCode,
        unitMeasure: sourceItem.unitMeasure,
        location: payload.targetLocation,
        batches: [],
        totalStock: 0,
        quantityReserved: 0,
      })
    } else {
      destItem.searchableName = sourceItem.searchableName
      destItem.searchableCode = sourceItem.searchableCode
      destItem.unitMeasure = sourceItem.unitMeasure
    }

    // Adăugăm lotul în destinație (copie identică a datelor, doar cantitatea e cea transferată)
    destItem.batches.push({
      _id: new Types.ObjectId(),
      quantity: payload.quantity,
      unitCost: batchSnapshot.unitCost,
      entryDate: batchSnapshot.entryDate, // Păstrăm vechimea lotului!
      movementId: batchSnapshot.movementId, // Păstrăm legătura cu intrarea originală
      supplierId: batchSnapshot.supplierId,
      supplierName: batchSnapshot.supplierName,
      qualityDetails: batchSnapshot.qualityDetails,
      receptionRef: batchSnapshot.receptionRef,
      orderRef: batchSnapshot.orderRef,
      supplierOrderNumber: batchSnapshot.supplierOrderNumber,
    })

    // Recalculăm totalurile pe destinație
    await recalculateInventorySummary(destItem)
    await destItem.save({ session })
    // Înregistrăm mișcarea de INTRARE (Audit)
    await StockMovementModel.create(
      [
        {
          stockableItem: sourceItem.stockableItem,
          stockableItemType: sourceItem.stockableItemType,
          movementType: 'TRANSFER_IN',
          locationFrom: sourceItem.location,
          locationTo: payload.targetLocation,
          quantity: payload.quantity,
          unitMeasure: unitMeasure,
          responsibleUser: userSession.user.id,
          responsibleUserName: userSession.user.name,
          unitCost: batchSnapshot.unitCost,
          lineCost: payload.quantity * batchSnapshot.unitCost,
          balanceBefore: destItem.totalStock - payload.quantity,
          balanceAfter: destItem.totalStock,
          note: `Transfer intrare din gestiune - ${LOCATION_NAMES_MAP[sourceItem.location as keyof typeof LOCATION_NAMES_MAP] || sourceItem.location}`,
          referenceId: transferGroupId,
          supplierId: batchSnapshot.supplierId,
          supplierName: batchSnapshot.supplierName,
          qualityDetails: batchSnapshot.qualityDetails,
          timestamp: new Date(),
        },
      ],
      { session },
    )

    await session.commitTransaction()

    revalidatePath('/admin/management/inventory/stock')
    return { success: true }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare la transfer:', error)
    return {
      success: false,
      error: error.message || 'Transferul a eșuat.',
    }
  } finally {
    session.endSession()
  }
}

/**
 * Ajustează manual stocul (Plus sau Minus).
 * - Minus: Necesită batchId obligatoriu.
 * - Plus: Poate fi pe lot existent (batchId) sau lot nou (fără batchId).
 */
export async function adjustStock(input: AdjustStockInput) {
  const session = await startSession()
  session.startTransaction()

  try {
    await connectToDatabase()
    const payload = adjustStockSchema.parse(input)
    const adjustmentId = new Types.ObjectId()

    const userSession = await auth()
    if (!userSession?.user) {
      throw new Error('Utilizatorul nu este autentificat.')
    }

    // 1. Găsim InventoryItem
    const inventoryItem = await InventoryItemModel.findById(
      payload.inventoryItemId,
    )
      .populate('stockableItem')
      .session(session)

    if (!inventoryItem) throw new Error('Articolul nu a fost găsit.')

    // 2. Populare date denormalizate (dacă lipsesc)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemData = inventoryItem.stockableItem as any
    const itemName = itemData?.name || ''
    const itemCode = itemData?.productCode || ''
    const unitMeasure = itemData?.unit || itemData?.packagingUnit || '-'

    if (!inventoryItem.searchableName || !inventoryItem.unitMeasure) {
      inventoryItem.searchableName = itemName
      inventoryItem.searchableCode = itemCode
      inventoryItem.unitMeasure = unitMeasure
    }

    const isIn = IN_TYPES.has(payload.adjustmentType)
    const isOut = OUT_TYPES.has(payload.adjustmentType)

    if (!isIn && !isOut) {
      throw new Error('Tipul ajustării este invalid.')
    }

    // --- LOGICA DE PREȚ (MODIFICATĂ) ---
    // Prioritate: 1. Input Manual, 2. Ultimul preț de achiziție, 3. Zero
    // Acest cost va fi folosit pentru înregistrarea Mișcării (StockMovement)
    let movementUnitCost =
      payload.unitCost ?? (inventoryItem.lastPurchasePrice || 0)

    const balanceBefore = inventoryItem.totalStock
    let balanceAfter = 0

    // Inițializăm variabilele pentru a fi vizibile în ambele blocuri (if/else)
    let supplierId: Types.ObjectId | undefined = undefined
    let supplierName: string | undefined = undefined
    let qualityDetails: any = undefined

    const movementId = new Types.ObjectId()

    // =========================================================
    //  SCENARIUL 1: IEȘIRE (SCĂDERE STOC)
    // =========================================================
    if (isOut) {
      if (!payload.batchId) {
        throw new Error(
          'Pentru scădere stoc, selectarea lotului este obligatorie.',
        )
      }

      const batchIndex = inventoryItem.batches.findIndex(
        (b: any) => b._id.toString() === payload.batchId,
      )

      if (batchIndex === -1)
        throw new Error('Lotul specificat nu a fost găsit.')

      const targetBatch = inventoryItem.batches[batchIndex]

      if (targetBatch.quantity < payload.quantity) {
        throw new Error(
          `Stoc insuficient pe lotul selectat (Disponibil: ${targetBatch.quantity}).`,
        )
      }

      // Luăm datele de trasabilitate din lotul real
      supplierId = targetBatch.supplierId
      supplierName = targetBatch.supplierName
      qualityDetails = targetBatch.qualityDetails

      // ATENȚIE: La ieșire, prețul pentru 'Arhivă' (Valoarea contabilă reală care iese)
      // trebuie să fie costul lotului, altfel stricăm media ponderată a stocului rămas.
      // Dar movementUnitCost rămâne cel ales de user (dacă vrea să raporteze altceva).
      const realBatchCost = targetBatch.unitCost

      // Scădere efectivă
      if (targetBatch.quantity === payload.quantity) {
        // Se consumă tot -> Arhivăm
        await ArchivedBatchModel.create(
          [
            {
              originalItemId: inventoryItem._id,
              stockableItem: inventoryItem.stockableItem,
              stockableItemType: inventoryItem.stockableItemType,
              location: inventoryItem.location,
              quantityOriginal: targetBatch.quantity,
              unitCost: realBatchCost, // Arhivăm cu costul REAL de achiziție
              entryDate: targetBatch.entryDate,
              movementId: targetBatch.movementId,
              supplierId: targetBatch.supplierId,
              qualityDetails: targetBatch.qualityDetails,
              archivedAt: new Date(),
              notes: `Ajustare stoc: ${payload.adjustmentType} - ${payload.reason}`,
            },
          ],
          { session },
        )
        inventoryItem.batches.splice(batchIndex, 1)
      } else {
        targetBatch.quantity -= payload.quantity
      }

      await recalculateInventorySummary(inventoryItem)
      balanceAfter = inventoryItem.totalStock
    }

    // =========================================================
    //  SCENARIUL 2: INTRARE (CREȘTERE STOC)
    // =========================================================
    else if (isIn) {
      let targetBatch = null

      // Încercăm să găsim un lot compatibil pentru MERGE
      if (payload.batchId) {
        const batchIndex = inventoryItem.batches.findIndex(
          (b: any) => b._id.toString() === payload.batchId,
        )

        if (batchIndex !== -1) {
          const candidateBatch = inventoryItem.batches[batchIndex]

          // --- LOGICA CRITICĂ DE MERGE ---
          // Unim cu lotul existent DOAR DACĂ:
          // 1. Nu s-a specificat un cost manual (folosim automat costul lotului)
          // 2. SAU Costul manual este IDENTIC cu costul lotului.
          if (
            payload.unitCost === undefined ||
            payload.unitCost === candidateBatch.unitCost
          ) {
            targetBatch = candidateBatch
          }
          // Dacă userul a pus preț diferit, 'targetBatch' rămâne null => se va crea lot nou mai jos.
        }
      }

      // CAZUL A: Merge (Preț identic)
      if (targetBatch) {
        targetBatch.quantity += payload.quantity

        // Dacă facem merge, costul mișcării este costul lotului existent
        movementUnitCost = targetBatch.unitCost

        supplierId = targetBatch.supplierId
        supplierName = targetBatch.supplierName
        qualityDetails = targetBatch.qualityDetails
      }
      // CAZUL B: Lot Nou (Preț diferit sau lot neselectat)
      else {
        // Aici movementUnitCost este exact ce a introdus userul (sau lastPrice)
        inventoryItem.batches.push({
          _id: new Types.ObjectId(),
          quantity: payload.quantity,
          unitCost: movementUnitCost,
          entryDate: new Date(),
          movementId: movementId,
          supplierId: undefined,
          supplierName: undefined,
          qualityDetails: { additionalNotes: payload.reason },
        })
      }

      await recalculateInventorySummary(inventoryItem)
      balanceAfter = inventoryItem.totalStock
    }

    await inventoryItem.save({ session })

    // --- LOG (StockMovement) ---
    const movement = new StockMovementModel({
      _id: movementId,
      stockableItem: inventoryItem.stockableItem,
      stockableItemType: inventoryItem.stockableItemType,
      movementType: payload.adjustmentType,
      locationFrom: isOut ? inventoryItem.location : undefined,
      locationTo: isIn ? inventoryItem.location : undefined,
      quantity: payload.quantity,
      unitMeasure: unitMeasure,
      responsibleUser: userSession.user.id,
      responsibleUserName: userSession.user.name,
      unitCost: movementUnitCost,
      lineCost: payload.quantity * movementUnitCost,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      note: payload.reason,
      referenceId: adjustmentId,
      supplierId: supplierId,
      supplierName: supplierName,
      qualityDetails: qualityDetails,
      timestamp: new Date(),
    })

    await movement.save({ session })

    await session.commitTransaction()
    revalidatePath('/admin/management/inventory/stock')
    return { success: true }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare la ajustare:', error)
    return {
      success: false,
      error: error.message || 'Ajustarea a eșuat.',
    }
  } finally {
    session.endSession()
  }
}

/**
 * Adaugă Stoc Inițial pentru un produs într-o locație.
 * Dacă InventoryItem nu există, îl creează automat.
 */
export async function addInitialStock(input: AddInitialStockInput) {
  await connectToDatabase()

  const session = await startSession()
  session.startTransaction()

  try {
    const payload = addInitialStockSchema.parse(input)

    const userSession = await auth()
    if (!userSession?.user) {
      throw new Error('Utilizatorul nu este autentificat.')
    }

    // 1. Identificăm Produsul/Ambalajul pentru date (UM, Nume)
    let productDoc = null
    let itemName = ''
    let itemCode = ''

    if (payload.stockableItemType === 'ERPProduct') {
      productDoc = await ERPProductModel.findById(
        payload.stockableItemId,
      ).session(session)
      if (productDoc) {
        itemName = productDoc.name
        itemCode = productDoc.productCode || ''
      }
    } else {
      productDoc = await PackagingModel.findById(
        payload.stockableItemId,
      ).session(session)
      if (productDoc) {
        itemName = productDoc.name
        itemCode = productDoc.productCode || ''
      }
    }

    if (!productDoc) {
      throw new Error('Produsul selectat nu a fost găsit în baza de date.')
    }

    // --- LOGICA ROBUSTĂ PENTRU UM (fixul discutat anterior) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemData = productDoc as any
    const unitMeasure = itemData?.unit || itemData?.packagingUnit || '-'

    let supplierNameSnapshot = undefined
    if (payload.supplierId) {
      const supplier = await SupplierModel.findById(payload.supplierId).session(
        session,
      )
      if (supplier) {
        supplierNameSnapshot = supplier.name
      }
    }

    // 2. Căutăm sau Creăm InventoryItem
    let inventoryItem = await InventoryItemModel.findOne({
      stockableItem: new Types.ObjectId(payload.stockableItemId),
      stockableItemType: payload.stockableItemType,
      location: payload.location.trim(),
    }).session(session)

    if (!inventoryItem) {
      // Nu există stoc în această locație -> Creăm documentul
      inventoryItem = new InventoryItemModel({
        stockableItem: new Types.ObjectId(payload.stockableItemId),
        stockableItemType: payload.stockableItemType,
        searchableName: itemName,
        searchableCode: itemCode,
        unitMeasure: unitMeasure,
        location: payload.location.trim(),
        batches: [],
        totalStock: 0,
        quantityReserved: 0,
        lastPurchasePrice: payload.unitCost,
        averageCost: payload.unitCost,
        minPurchasePrice: payload.unitCost,
        maxPurchasePrice: payload.unitCost,
      })
    } else {
      inventoryItem.searchableName = itemName
      inventoryItem.searchableCode = itemCode
      inventoryItem.unitMeasure = unitMeasure
    }

    // --- LOGICA DE REGLARE STOC NEGATIV ---
    let batchQuantity = payload.quantity
    const oldStockBalance = inventoryItem.totalStock

    // Dacă avem datorie (stoc negativ), o scădem din ce intră acum
    if (inventoryItem.totalStock < 0) {
      const deficit = Math.abs(inventoryItem.totalStock) // ex: 5

      if (batchQuantity >= deficit) {
        // Avem destulă marfă să acoperim datoria (ex: intră 1415, datoria e 5 => rămân 1410)
        batchQuantity = batchQuantity - deficit

        // Setăm temporar stocul pe 0, ca recalcularea să pornească curat de la suma loturilor
        inventoryItem.totalStock = 0
      } else {
        // Marfa nu ajunge să acopere datoria (ex: intră 3, datoria e 5)
        // Doar diminuăm datoria (-5 + 3 = -2) și NU creăm lot fizic
        inventoryItem.totalStock += batchQuantity
        batchQuantity = 0
      }
    }

    // 3. Creăm Lotul Nou
    const newBatchId = new Types.ObjectId()
    const movementId = new Types.ObjectId() // ID-ul mișcării curente
    const importOperationId = new Types.ObjectId()

    // Pregătim supplierId dacă există
    const supplierId = payload.supplierId
      ? new Types.ObjectId(payload.supplierId)
      : undefined

    if (batchQuantity > 0) {
      inventoryItem.batches.push({
        _id: newBatchId,
        quantity: batchQuantity, // Aici va fi 1410 (1415 - 5)
        unitCost: payload.unitCost,
        entryDate: new Date(),
        movementId: movementId,
        supplierId: supplierId,
        supplierName: supplierNameSnapshot,
        qualityDetails: payload.qualityDetails || {},
      })
    }

    // Actualizăm ultimul preț de achiziție
    inventoryItem.lastPurchasePrice = payload.unitCost

    // Recalculăm totalurile
    await recalculateInventorySummary(inventoryItem)
    await inventoryItem.save({ session })

    // 4. Creăm Mișcarea de Stoc (Log)
    const movement = new StockMovementModel({
      _id: movementId,
      stockableItem: new Types.ObjectId(payload.stockableItemId),
      stockableItemType: payload.stockableItemType,
      movementType: 'STOC_INITIAL',
      locationTo: payload.location.trim(),
      quantity: payload.quantity,
      unitMeasure: unitMeasure,
      responsibleUser: userSession.user.id,
      responsibleUserName: userSession.user.name,
      unitCost: payload.unitCost,
      lineCost: payload.quantity * payload.unitCost,
      balanceBefore: oldStockBalance,
      balanceAfter: inventoryItem.totalStock,
      note: payload.reason,
      referenceId: importOperationId,
      supplierId: supplierId,
      supplierName: supplierNameSnapshot,
      qualityDetails: payload.qualityDetails,
      timestamp: new Date(),
      status: 'ACTIVE',
    })

    await movement.save({ session })

    await session.commitTransaction()

    // Revalidăm calea (ajustează calea dacă e diferită în aplicația ta)
    revalidatePath(`/admin/management/inventory/stock/${payload.location}`)

    return { success: true }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare la adăugare stoc inițial:', error)
    return {
      success: false,
      error: error.message || 'Adăugarea stocului a eșuat.',
    }
  } finally {
    session.endSession()
  }
}
