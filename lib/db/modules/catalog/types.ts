export interface IAdminCatalogItem {
  _id: string
  productCode: string
  image: string | null
  name: string
  averagePurchasePrice: number
  defaultMarkups: {
    markupDirectDeliveryPrice: number
    markupFullTruckPrice: number
    markupSmallDeliveryBusinessPrice: number
    markupRetailPrice: number
  }
  barCode: string | null
  isPublished: boolean
  createdAt: Date
  totalStock: number
  unit: string
  packagingOptions: {
    unitName: string
    baseUnitEquivalent: number
  }[]
}

// Tipul de date pentru o pagină întreagă de rezultate
export interface IAdminCatalogPage {
  data: IAdminCatalogItem[]
  total: number
  totalPages: number
  from: number
  to: number
}
export interface ICatalogItem {
  _id: string
  productCode: string
  image: string | null
  name: string
  category: string | null
  directDeliveryPrice: number
  fullTruckPrice: number
  smallDeliveryBusinessPrice: number
  retailPrice: number
  totalStock: number
  barCode: string | null
  isPublished: boolean
  unit: string
  packagingOptions: {
    unitName: string
    baseUnitEquivalent: number
  }[]
}

// Tipul de date pentru o pagină întreagă de rezultate din catalog
export interface ICatalogPage {
  data: ICatalogItem[]
  total: number
  totalPages: number
  from: number
  to: number
}
