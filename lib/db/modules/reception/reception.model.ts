import { Document, Model, models, model, Schema, Types } from 'mongoose'
import { IReceptionInput } from '@/types'

export interface IReceptionDoc extends Document, IReceptionInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const receptionSchema = new Schema(
  {
    // Utilizatorul care a realizat recepția (cine a introdus datele de recepție)
    createdBy: {
      type: Types.ObjectId,
      ref: 'User', // Leagă acest câmp de modelul "User"
      required: true, // Câmp obligatoriu
    },
    // Referință la furnizorul care a efectuat livrarea
    supplier: {
      type: Types.ObjectId,
      ref: 'Supplier', // Leagă acest câmp de modelul "Supplier"
      required: true, // Câmp obligatoriu
    },
    // Lista de produse recepționate
    products: [
      {
        // Referință la produsul recepționat
        product: {
          type: Types.ObjectId,
          ref: 'Product', // Leagă acest câmp de modelul "Product"
        },
        // Cantitatea produsului recepționat (obligatoriu)
        quantity: {
          type: Number,
          required: true,
        },
        // Unitatea de măsură a produsului (ex: "buc", "kg", "palet")
        unitMeasure: {
          type: String,
          required: true,
        },
        // Prețul de intrare (achiziție) al produsului la momentul recepției
        priceAtReception: {
          type: Number,
          default: null,
          required: false,
        },
      },
    ],
    // Data la care a avut loc recepția; implicit se setează data curentă
    receptionDate: {
      type: Date,
      default: Date.now,
    },
    // Numele șoferului care a efectuat livrarea (opțional)
    driverName: {
      type: String,
      required: false,
    },
    // Numărul autoturismului sau al vehiculului de livrare (opțional)
    carNumber: {
      type: String,
      required: false,
    },
    // Statusul recepției, care poate fi "Draft" (în curs de editare) sau "Final" (complet finalizată)
    status: {
      type: String,
      default: 'Draft',
      enum: ['Draft', 'Final'],
    },
  },
  { timestamps: true } 
)

// Crearea indexurilor pentru îmbunătățirea performanței interogărilor
receptionSchema.index({ createdBy: 1 }) // Index pe câmpul "createdBy"
receptionSchema.index({ supplier: 1 }) // Index pe câmpul "supplier"
receptionSchema.index({ receptionDate: 1 }) // Index pe câmpul "receptionDate"
receptionSchema.index({ status: 1 }) // Index pe câmpul "status"

// Crearea modelului "Reception" folosind schema definită
const ReceptionModel: Model<IReceptionDoc> =
  (models.Reception as Model<IReceptionDoc>) ||
  model<IReceptionDoc>('Reception', receptionSchema)

export default ReceptionModel
