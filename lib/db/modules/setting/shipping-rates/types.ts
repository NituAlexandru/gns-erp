export interface ShippingRateDTO {
  _id: string
  name: string
  type: string
  ratePerKm: number
  costPerKm?: number
}
