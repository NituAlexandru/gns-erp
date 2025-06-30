export interface IMarkupHistoryInput {
  product: string // ObjectId al produsului
  defaultMarkups: {
    directDeliveryPrice: number
    fullTruckPrice: number
    smallDeliveryBusinessPrice: number
    retailPrice: number
  }
  effectiveDate: Date
}

export interface IMarkupHistoryDoc extends IMarkupHistoryInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
