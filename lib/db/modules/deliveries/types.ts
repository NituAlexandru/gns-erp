export interface IDeliveryInput {
  order: string 
  driver: string // ObjectId al utilizatorului sau string liber
  vehicle: string // ObjectId al vehiculului
  carNumber: string
  deliveryDate: Date // dacă nu pui, se va lua acum
  client: string
  status?: string
  notes?: string
}

/** Documentul complet stocat în Mongo (cu timestamps și _id) */
export interface IDeliveryDoc extends IDeliveryInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
