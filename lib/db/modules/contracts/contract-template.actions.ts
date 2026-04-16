'use server'

import { connectToDatabase } from '@/lib/db'
import ContractTemplate from './contract-template.model'
import { revalidatePath } from 'next/cache'

export async function getContractTemplates() {
  try {
    await connectToDatabase()
    const templates = await ContractTemplate.find()
      .sort({ createdAt: -1 })
      .lean()

    // Dacă nu există niciunul, creăm unul default gol pentru a avea de unde începe
    if (templates.length === 0) {
      const defaultTemplate = await ContractTemplate.create({
        name: 'Contract Standard B2B',
        type: 'CONTRACT',
        isDefault: true,
        paragraphs: [
          {
            id: 'p1',
            title: 'I. Părțile Contractante',
            content:
              'Subscrisa {{nume_companie}}... și clientul {{nume_client}}...',
            order: 1,
          },
          {
            id: 'p2',
            title: 'II. Obiectul Contractului',
            content: 'Vânzarea de produse conform comenzilor...',
            order: 2,
          },
        ],
      })
      return JSON.parse(JSON.stringify([defaultTemplate]))
    }

    return JSON.parse(JSON.stringify(templates))
  } catch (error) {
    console.error('Eroare getContractTemplates:', error)
    return []
  }
}

export async function saveContractTemplate(templateId: string, data: any) {
  try {
    await connectToDatabase()

    // Dacă ID-ul începe cu temp_, înseamnă că am creat un tab nou din UI și trebuie inserat în DB
    if (templateId.startsWith('temp_')) {
      await ContractTemplate.create({
        name: data.name,
        documentTitle: data.documentTitle,
        type: data.type,
        paragraphs: data.paragraphs,
      })
    } else {
      // Dacă e deja în DB, îi facem update complet
      await ContractTemplate.findByIdAndUpdate(templateId, {
        name: data.name,
        documentTitle: data.documentTitle,
        paragraphs: data.paragraphs,
      })
    }

    revalidatePath('/admin/settings')
    return { success: true, message: 'Șablonul a fost salvat cu succes!' }
  } catch (error) {
    console.error('Eroare saveContractTemplate:', error)
    return { success: false, message: 'Eroare la salvarea șablonului.' }
  }
}
