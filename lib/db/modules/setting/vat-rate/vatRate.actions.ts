'use server'

import { startSession } from 'mongoose'
import { VatRateModel, DefaultVatHistoryModel } from './vatRate.model'
import {
  VatRateCreateInput,
  VatRateUpdateInput,
  SetDefaultVatRateInput,
} from './types'
import {
  VatRateCreateSchema,
  VatRateUpdateSchema,
  SetDefaultVatRateSchema,
} from './validator'
import User from '../../user/user.model'

//  Returnează toate cotele de TVA active, sortate după valoare.
export async function getVatRates() {
  try {
    const rates = await VatRateModel.find({ isActive: true })
      .sort({ rate: -1 })
      .lean()
    return { success: true, data: rates }
  } catch (error) {
    console.error('Eroare la preluarea cotelor TVA:', error)
    return { success: false, message: 'Nu am putut prelua cotele TVA.' }
  }
}

// Returnează cota de TVA implicită.
export async function getDefaultVatRate() {
  try {
    const defaultRate = await VatRateModel.findOne({ isDefault: true }).lean()
    if (!defaultRate) {
      const fallbackRate = await VatRateModel.findOne({ isActive: true })
        .sort({ rate: 1 })
        .lean()
      return { success: true, data: fallbackRate }
    }
    return { success: true, data: defaultRate }
  } catch (error) {
    console.error('Eroare la preluarea cotei TVA implicite:', error)
    return { success: false, message: 'Nu am putut prelua cota implicită.' }
  }
}

// Creează o nouă cotă de TVA.
export async function createVatRate(input: VatRateCreateInput) {
  try {
    const data = VatRateCreateSchema.parse(input)
    const newRate = await VatRateModel.create(data)
    return { success: true, data: JSON.parse(JSON.stringify(newRate)) }
  } catch (error) {
    console.error('Eroare la crearea cotei TVA:', error)
    return { success: false, message: 'Nu am putut crea noua cotă TVA.' }
  }
}

// Actualizează o cotă de TVA existentă.
export async function updateVatRate(input: VatRateUpdateInput) {
  try {
    const { _id, ...updateData } = VatRateUpdateSchema.parse(input)
    const updatedRate = await VatRateModel.findByIdAndUpdate(_id, updateData, {
      new: true,
    })
    if (!updatedRate) throw new Error('Cota TVA nu a fost găsită.')
    return { success: true, data: JSON.parse(JSON.stringify(updatedRate)) }
  } catch (error) {
    console.error('Eroare la actualizarea cotei TVA:', error)
    return { success: false, message: 'Nu am putut actualiza cota TVA.' }
  }
}

// Setează o cotă de TVA ca fiind cea implicită. Operațiune tranzacțională.
export async function setDefaultVatRate(input: SetDefaultVatRateInput) {
  const session = await startSession()
  try {
    const { rateId, userId } = SetDefaultVatRateSchema.parse(input)
    let newDefaultRate

    await session.withTransaction(async (transactionSession) => {
      await VatRateModel.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } },
        { session: transactionSession }
      )

      newDefaultRate = await VatRateModel.findByIdAndUpdate(
        rateId,
        { $set: { isDefault: true, isActive: true } },
        { new: true, session: transactionSession }
      )

      if (!newDefaultRate) {
        throw new Error('Cota de TVA selectată nu a fost găsită.')
      }

      await DefaultVatHistoryModel.create(
        [
          {
            vatRateId: newDefaultRate._id,
            rateValue: newDefaultRate.rate,
            setByUserId: userId,
          },
        ],
        { session: transactionSession }
      )
    })

    return {
      success: true,
      message: 'Cota implicită a fost actualizată.',
      data: JSON.parse(JSON.stringify(newDefaultRate)),
    }
  } catch (error) {
    console.error('Eroare la setarea cotei implicite:', error)
    return { success: false, message: 'Nu am putut seta cota implicită.' }
  } finally {
    await session.endSession()
  }
}

// Returnează istoricul cotelor de TVA setate ca implicite.
export async function getDefaultVatHistory() {
  try {
    const history = await DefaultVatHistoryModel.find({})
      .sort({ setAsDefaultAt: -1 })
      .populate({ path: 'vatRateId', model: VatRateModel, select: 'name' })
      .populate({ path: 'setByUserId', model: User, select: 'name' })
      .lean()

    return { success: true, data: history }
  } catch (error) {
    console.error('Eroare la preluarea istoricului TVA:', error)
    return { success: false, message: 'Nu am putut prelua istoricul.' }
  }
}
