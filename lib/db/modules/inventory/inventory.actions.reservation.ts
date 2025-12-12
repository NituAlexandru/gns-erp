import { ClientSession, Types } from 'mongoose'
import InventoryItemModel from './inventory.model'
import StockReservationModel from './reservation.model'
import { IOrderLineItem } from '../order/types'
import ERPProductModel from '../product/product.model'
import PackagingModel from '../packaging-products/packaging.model'

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
      // PREGĂTIRE DATE: Căutăm detaliile produsului pentru a le pune pe InventoryItem (dacă trebuie creat)
      // Vrem să avem Nume, Cod și UM chiar dacă stocul e zero/negativ.
      let finalName = ''
      let finalCode = ''
      let finalUnit = '-'

      if (item.stockableItemType === 'ERPProduct') {
        const prod = await ERPProductModel.findById(item.productId)
          .select('name productCode unit')
          .session(session)
        if (prod) {
          finalName = prod.name
          finalCode = prod.productCode || ''
          finalUnit = prod.unit || '-'
        }
      } else {
        const pkg = await PackagingModel.findById(item.productId)
          .select('name productCode packagingUnit')
          .session(session)
        if (pkg) {
          finalName = pkg.name
          finalCode = pkg.productCode || ''
          finalUnit = pkg.packagingUnit || '-'
        }
      }

      // Facem Update sau Insert (Upsert)
      await InventoryItemModel.findOneAndUpdate(
        { stockableItem: item.productId, location: 'DEPOZIT' },
        {
          $inc: { quantityReserved: quantityStillToReserve },
          // $setOnInsert se execută DOAR dacă documentul nu există (Backorder pur)
          $setOnInsert: {
            stockableItem: item.productId,
            stockableItemType: item.stockableItemType,
            location: 'DEPOZIT',
            searchableName: finalName,
            searchableCode: finalCode,
            unitMeasure: finalUnit,
            batches: [],
            totalStock: 0,
            averageCost: 0,
            maxPurchasePrice: 0,
            minPurchasePrice: 0,
            lastPurchasePrice: 0,
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
