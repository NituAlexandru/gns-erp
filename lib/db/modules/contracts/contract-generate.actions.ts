'use server'

import { connectToDatabase } from '@/lib/db'
import GeneratedContract from './generated-contract.model'
import mongoose, { Types } from 'mongoose'
import { revalidatePath } from 'next/cache'
import ClientModel from '../client/client.model'
import { getSetting } from '../setting/setting.actions'
import ContractTemplate from './contract-template.model'
import { generateNextDocumentNumber } from '../numbering/numbering.actions'
import ClientSummary from '../client/summary/client-summary.model'

// Aduce tot istoricul de contracte și acte adiționale pentru un client
export async function getClientContracts(clientId: string) {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(clientId)) {
      return []
    }

    const contracts = await GeneratedContract.find({
      clientId: new Types.ObjectId(clientId),
    })
      .sort({ date: -1, createdAt: -1 })
      .lean()

    return JSON.parse(JSON.stringify(contracts))
  } catch (error) {
    console.error('Eroare la getClientContracts:', error)
    return []
  }
}

// ==========================================
// FUNCȚII AJUTĂTOARE (DRY - Don't Repeat Yourself)
// ==========================================

async function getClientAndSettings(clientId: string) {
  const client = await ClientModel.findById(clientId)
  if (!client) throw new Error('Clientul nu a fost găsit.')

  const settings = await getSetting()
  if (!settings) throw new Error('Setările companiei nu sunt configurate.')

  return { client, settings }
}

function processTemplateParagraphs(
  paragraphs: any[],
  client: any,
  settings: any,
  summary: any,
) {
  const deliveryContacts =
    client.deliveryAddresses
      ?.map(
        (addr: any) =>
          `- ${addr.persoanaContact} – telefon ${addr.telefonContact}`,
      )
      .join('\n') || ''

  const variables: Record<string, string> = {
    nume_client: client.name,
    cui_client: client.vatId || client.cnp || '',
    adresa_client: `${client.address?.localitate || ''}, ${client.address?.judet || ''}, ${client.address?.strada || ''}`,
    nume_companie: settings.name,
    data_contract: new Date().toLocaleDateString('ro-RO'),
    termen_plata: client.paymentTerm?.toString() || '0',
    plafon_credit: summary?.creditLimit?.toLocaleString('ro-RO') || '0',
    persoana_contact_principal: client.address?.persoanaContact || '',
    telefon_contact_principal: client.address?.telefonContact || '',
    lista_persoane_receptie: deliveryContacts ? `\n${deliveryContacts}` : '',
  }

  return paragraphs.map((para: any) => {
    let content = para.content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, value)
    })
    return { ...para, content }
  })
}

// ==========================================
// 1. GENERARE CONTRACT PRINCIPAL
// ==========================================
export async function generateContract(clientId: string, adminId: string) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    await connectToDatabase()

    // 1. Preluăm datele necesare
    const template = await ContractTemplate.findOne({
      type: 'CONTRACT',
      isDefault: true,
    }).session(session)
    const client = await ClientModel.findById(clientId).session(session)
    const summary = await ClientSummary.findOne({ clientId }).session(session)
    const settings = await getSetting()

    if (!template || !client || !settings)
      throw new Error('Date insuficiente pentru generare')

    // 2. Incrementăm numărul (în interiorul tranzacției)
    const nextNumber = await generateNextDocumentNumber('GNS', { session })
    const formattedNumber = String(nextNumber).padStart(3, '0')

    const deliveryContacts =
      client.deliveryAddresses
        ?.map(
          (addr: any) =>
            `- ${addr.persoanaContact} – telefon ${addr.telefonContact}`,
        )
        .join('\n') || ''

    // 3. Procesăm variabilele (Search & Replace) acum, pentru snapshot
    const variables = {
      nume_client: client.name,
      cui_client: client.vatId || client.cnp,
      adresa_client: `${client.address.localitate}, ${client.address.strada}`,
      nume_companie: settings.name,
      data_contract: new Date().toLocaleDateString('ro-RO'),
      termen_plata: client.paymentTerm?.toString() || '0',
      plafon_credit: summary?.creditLimit?.toLocaleString('ro-RO') || '0',
      persoana_contact_principal: client.address?.persoanaContact || '',
      telefon_contact_principal: client.address?.telefonContact || '',
      lista_persoane_receptie: deliveryContacts ? `\n${deliveryContacts}` : '',
    }

    const finalParagraphs = template.paragraphs.map((p) => {
      let content = p.content
      Object.entries(variables).forEach(([key, val]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), val || '')
      })
      return { title: p.title, content }
    })

    // 4. Salvăm totul (Snapshot)
    const newContract = await GeneratedContract.create(
      [
        {
          clientId: client._id,
          templateId: template._id,
          type: 'CONTRACT',
          series: 'GNS',
          number: formattedNumber,
          documentTitle: template.documentTitle,
          date: new Date(),
          clientSnapshot: JSON.parse(JSON.stringify(client)),
          companySnapshot: JSON.parse(JSON.stringify(settings)),
          paragraphs: finalParagraphs,
          createdBy: adminId,
        },
      ],
      { session },
    )

    await ClientModel.findByIdAndUpdate(clientId, {
      contractNumber: newContract[0].number,
      contractDate: newContract[0].date,
      isErpCreatedContract: true,
      activeContractId: newContract[0]._id,
    }).session(session)

    await session.commitTransaction()
    return { success: true, message: 'Contract generat!' }
  } catch (error: any) {
    await session.abortTransaction()
    return { success: false, message: error.message }
  } finally {
    session.endSession()
  }
}

// ==========================================
// 2. GENERARE ACT ADIȚIONAL
// ==========================================
export async function generateAddendum(
  clientId: string,
  templateId: string,
  adminId: string,
) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    await connectToDatabase()

    // 1. Preluăm datele (folosim session peste tot pentru consistență)
    const client = await ClientModel.findById(clientId).session(session)
    if (!client) throw new Error('Clientul nu a fost găsit.')
    if (!client.activeContractId)
      throw new Error('Clientul nu are un contract activ.')

    const summary = await ClientSummary.findOne({ clientId }).session(session)
    const settings = await getSetting()

    if (!settings) throw new Error('Setările companiei nu sunt configurate.')

    const template =
      await ContractTemplate.findById(templateId).session(session)
    if (!template || template.type !== 'ADDENDUM')
      throw new Error('Șablon invalid.')

    // 2. Numerotare locală (Strict per contract părinte)
    const existingCount = await GeneratedContract.countDocuments({
      parentContractId: client.activeContractId,
      type: 'ADDENDUM',
    }).session(session)

    const nextNumber = String(existingCount + 1) // 1, 2, 3...

    // 3. Procesăm paragrafele pentru Snapshot
    const processedParagraphs = processTemplateParagraphs(
      template.paragraphs,
      client,
      settings,
      summary,
    )

    // 4. Salvare în DB (cu Snapshots obligatorii)
    const newAddendum = await GeneratedContract.create(
      [
        {
          clientId: client._id,
          templateId: template._id,
          type: 'ADDENDUM',
          parentContractId: client.activeContractId,
          series: 'AA',
          number: nextNumber,
          documentTitle: template.documentTitle || template.name,
          date: new Date(),
          clientSnapshot: JSON.parse(JSON.stringify(client)),
          companySnapshot: JSON.parse(JSON.stringify(settings)),
          paragraphs: processedParagraphs,
          createdBy: adminId,
        },
      ],
      { session },
    )

    // 5. BLOCUL DE UPDATE (Adăugat acum)
    // Salvăm actul adițional în profilul clientului
    await ClientModel.findByIdAndUpdate(clientId, {
      $push: {
        addendums: {
          number: newAddendum[0].number, // Salvăm STRICT numărul
          date: newAddendum[0].date,
          contractId: newAddendum[0]._id,
        },
      },
    }).session(session)

    await session.commitTransaction()

    revalidatePath(`/clients/${clientId}`)

    return {
      success: true,
      message: `Actul Adițional nr. ${nextNumber} a fost generat!`,
    }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare generare act adițional:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Eroare la generare.',
    }
  } finally {
    session.endSession()
  }
}

// ==========================================
// 3. ȘTERGERE CONTRACT SAU ACT ADIȚIONAL
// ==========================================
export async function deleteContractDocument(
  docId: string,
  clientId: string,
  type: 'CONTRACT' | 'ADDENDUM',
) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    await connectToDatabase()

    if (type === 'CONTRACT') {
      // 1. Ștergem contractul fizic
      await GeneratedContract.findByIdAndDelete(docId).session(session)

      // 2. Curățăm clientul și ștergem și actele adiționale legate de el
      await ClientModel.findByIdAndUpdate(
        clientId,
        {
          $unset: { contractNumber: 1, contractDate: 1, activeContractId: 1 },
          $set: { isErpCreatedContract: false, addendums: [] },
        },
        { session },
      )

      // Ștergem și actele adiționale asociate acestui contract (opțional dar recomandat)
      await GeneratedContract.deleteMany({
        parentContractId: docId,
        type: 'ADDENDUM',
      }).session(session)
    } else if (type === 'ADDENDUM') {
      // 1. Ștergem actul adițional fizic
      await GeneratedContract.findByIdAndDelete(docId).session(session)

      // 2. Îl scoatem din array-ul clientului
      await ClientModel.findByIdAndUpdate(
        clientId,
        {
          $pull: { addendums: { contractId: docId } },
        },
        { session },
      )
    }

    await session.commitTransaction()
    revalidatePath(`/clients/${clientId}`)

    return { success: true, message: 'Document șters cu succes!' }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare la ștergere document:', error)
    return { success: false, message: 'Eroare la ștergerea documentului.' }
  } finally {
    session.endSession()
  }
}
