import { Schema, model, models, Document, Model, Types } from 'mongoose'
import { IQualityDetails } from './inventory.model'

// Definim schema inline ca sa nu depindem de exporturi circulare
const QualityDetailsSchema = new Schema(
  {
    // Aici sunt ȘARJELE (ce scrie pe produs/etichetă de la fabrică)
    lotNumbers: { type: [String], default: [] }, // Ex: ["Sarja A1", "Sarja B2"]
    // Aici sunt NUMERELE DE CERTIFICAT (hârtiile de la furnizor)
    certificateNumbers: { type: [String], default: [] },
    // Aici sunt RAPOARTELE DE ÎNCERCĂRI (dacă există, ex: la betoane/fier)
    testReports: { type: [String], default: [] },
    // Aici sunt MENȚIUNI SUPLIMENTARE (orice altceva scris de gestionar)
    additionalNotes: { type: String },
  },
  { _id: false }
)

export interface IArchivedBatchDoc extends Document {
  originalItemId: Types.ObjectId // ID-ul InventoryItem-ului părinte
  stockableItem: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'
  location: string
  // Datele lotului original
  quantityOriginal: number
  unitCost: number
  entryDate: Date
  movementId: Types.ObjectId // Recepția originală
  // Trasabilitate
  supplierId?: Types.ObjectId
  qualityDetails?: IQualityDetails
  archivedAt: Date
}

const ArchivedBatchSchema = new Schema<IArchivedBatchDoc>(
  {
    originalItemId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    stockableItem: { type: Schema.Types.ObjectId, required: true },
    stockableItemType: { type: String, required: true },
    location: { type: String, required: true },
    quantityOriginal: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    entryDate: { type: Date, required: true },
    movementId: { type: Schema.Types.ObjectId, ref: 'StockMovement' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    qualityDetails: { type: QualityDetailsSchema },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const ArchivedBatchModel: Model<IArchivedBatchDoc> =
  (models.ArchivedBatch as Model<IArchivedBatchDoc>) ||
  model<IArchivedBatchDoc>('ArchivedBatch', ArchivedBatchSchema)

export default ArchivedBatchModel
