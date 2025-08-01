import ERPProductModel from '@/lib/db/modules/product/product.model' // Verifică dacă calea este corectă
import PackagingModel from '../packaging-products/packaging.model'

export interface StockableItemDetails {
  unit: string | null
  packagingUnit: string | null
  packagingQuantity: number | null
  itemsPerPallet: number | null
}
/**
 * Preia detaliile de conversie pentru un produs sau ambalaj.
 * @param id - ID-ul produsului sau ambalajului
 * @param type - 'Product' sau 'Packaging'
 * @returns Un obiect cu detaliile necesare pentru conversie sau aruncă o eroare dacă nu este găsit.
 */
export async function getStockableItemDetails(
  id: string,
  type: 'Product' | 'Packaging'
): Promise<StockableItemDetails> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any

  if (type === 'Product') {
    doc = await ERPProductModel.findById(id).lean()
  } else {
    const packagingDoc = await PackagingModel.findById(id).lean()
    doc = { ...packagingDoc, unit: 'buc' }
  }

  if (!doc) {
    throw new Error(
      `Articolul de tip '${type}' cu ID-ul '${id}' nu a fost găsit.`
    )
  }

  return {
    unit: doc.unit || null,
    packagingUnit: doc.packagingUnit || null,
    packagingQuantity: doc.packagingQuantity || null,
    itemsPerPallet: doc.itemsPerPallet || null,
  }
}
