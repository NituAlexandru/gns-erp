'use server'

import { connectToDatabase } from '../..'
import Setting from './setting.model'
import { formatError } from '@/lib/utils'
import { ISettingInput } from './types'
import { revalidatePath } from 'next/cache'

// Cache-ul global
const globalForSettings = global as unknown as {
  // Acum poate fi ISettingInput sau null
  cachedSettings: ISettingInput | null
}

export const getNoCachedSetting = async (): Promise<ISettingInput | null> => {
  await connectToDatabase()
  const setting = await Setting.findOne().lean()
  if (!setting) {
    return null
  }
  return JSON.parse(JSON.stringify(setting))
}

export const getSetting = async (): Promise<ISettingInput | null> => {
  // Verificăm dacă 'cachedSettings' a fost setat (chiar și la null)
  if (globalForSettings.cachedSettings !== undefined) {
    return globalForSettings.cachedSettings
  }

  console.log('🟡 Info: Preluare setări companie din DB.')
  await connectToDatabase()
  const setting = await Setting.findOne().lean()

  if (setting) {
    globalForSettings.cachedSettings = JSON.parse(
      JSON.stringify(setting)
    ) as ISettingInput
  } else {
    // Dacă DB e gol, setăm cache-ul la null
    globalForSettings.cachedSettings = null
  }

  return globalForSettings.cachedSettings
}

export const updateSetting = async (newSetting: ISettingInput) => {
  try {
    await connectToDatabase()

    // Validare logică: Asigură-te că un singur default e setat
    const bankDefaultCount = newSetting.bankAccounts.filter(
      (b) => b.isDefault
    ).length
    const emailDefaultCount = newSetting.emails.filter(
      (e) => e.isDefault
    ).length
    const phoneDefaultCount = newSetting.phones.filter(
      (p) => p.isDefault
    ).length

    if (
      bankDefaultCount !== 1 ||
      emailDefaultCount !== 1 ||
      phoneDefaultCount !== 1
    ) {
      throw new Error(
        'Trebuie să existe exact un cont bancar, un email și un telefon setat ca principal (default).'
      )
    }

    const updatedSetting = await Setting.findOneAndUpdate({}, newSetting, {
      upsert: true,
      new: true,
    }).lean()

    globalForSettings.cachedSettings = JSON.parse(
      JSON.stringify(updatedSetting)
    ) as ISettingInput

    revalidatePath('/settings')

    return {
      success: true,
      message: 'Setările au fost actualizate cu succes.',
      data: globalForSettings.cachedSettings,
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
