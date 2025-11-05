import { Document, Model, model, models, Schema } from 'mongoose'
import { ISettingInput } from './types'

export interface ISetting extends Document, ISettingInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

// Sub-schema pentru adresă
const AddressSubSchema = new Schema(
  {
    judet: { type: String, required: true },
    localitate: { type: String, required: true },
    strada: { type: String, required: true },
    numar: { type: String },
    codPostal: { type: String, required: true },
    tara: { type: String, required: true, default: 'RO' },
    alteDetalii: { type: String },
  },
  { _id: false }
)

// Sub-schema pentru Cont Bancar
const BankAccountSubSchema = new Schema(
  {
    bankName: { type: String, required: true },
    iban: { type: String, required: true },
    currency: { type: String, required: true, default: 'RON' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
)

// Sub-schema pentru Email
const EmailSubSchema = new Schema(
  {
    address: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
)

// Sub-schema pentru Telefon
const PhoneSubSchema = new Schema(
  {
    number: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
)

// Schema principală refactorizată
const settingSchema = new Schema<ISetting>(
  {
    name: { type: String, required: true },
    cui: { type: String, required: true },
    regCom: { type: String, required: true },
    address: { type: AddressSubSchema, required: true },
    web: { type: String },

    // Array-uri de sub-documente
    bankAccounts: { type: [BankAccountSubSchema], required: true },
    emails: { type: [EmailSubSchema], required: true },
    phones: { type: [PhoneSubSchema], required: true },
  },
  {
    timestamps: true,
  }
)

const Setting =
  (models.Setting as Model<ISetting>) ||
  model<ISetting>('Setting', settingSchema)

export default Setting
