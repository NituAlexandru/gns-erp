'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import { connectToDatabase } from '@/lib/db'
import {
  generateSplitInvoiceInputs,
  SplitClientConfig,
} from './split-invoice.helpers'
import { InvoiceInput, InvoiceLineInput } from '../invoice.types'
import ClientModel from '../../../client/client.model'
import { IClientDoc } from '../../../client/types'
import { generateNextDocumentNumber } from '../../../numbering/numbering.actions'
import InvoiceModel from '../invoice.model'
import { updateRelatedDocuments } from '../invoice.helpers'
import DeliveryNoteModel from '../../delivery-notes/delivery-note.model'
import { getSetting } from '../../../setting/setting.actions' // NECESAR
import { ISettingInput } from '../../../setting/types' // NECESAR
import DeliveryModel from '../../../deliveries/delivery.model'
import { round2 } from '@/lib/utils'

// Funcție helper copiată din invoice.actions.ts pentru consistență
function buildCompanySnapshot(settings: ISettingInput) {
  const defaultEmail = settings.emails.find((e) => e.isDefault)
  const defaultPhone = settings.phones.find((p) => p.isDefault)
  const defaultBank = settings.bankAccounts.find((b) => b.isDefault)

  if (!defaultEmail || !defaultPhone || !defaultBank) {
    throw new Error(
      'Setările implicite (email, telefon, bancă) nu sunt configurate.',
    )
  }
  return {
    name: settings.name,
    cui: settings.cui,
    regCom: settings.regCom,
    address: settings.address,
    email: defaultEmail.address,
    phone: defaultPhone.number,
    bank: defaultBank.bankName,
    iban: defaultBank.iban,
    currency: defaultBank.currency,
  }
}

// Input-ul pentru Server Action
export interface CreateSplitInvoicesInput {
  // Datele comune (header-ul facturii)
  // Excludem datele care se regenerează sau se calculează
  commonData: Omit<
    InvoiceInput,
    'clientId' | 'clientSnapshot' | 'items' | 'totals' | 'companySnapshot'
  >
  // Lista de itemi originali (sursa)
  originalItems: InvoiceLineInput[]
  // Configurația de split (cine primește ce cotă)
  splitConfigs: {
    clientId: string
    percentage: number
  }[]
}

export async function createSplitInvoices(
  data: CreateSplitInvoicesInput,
): Promise<{ success: boolean; message: string; invoiceIds?: string[] }> {
  await connectToDatabase()
  const session = await startSession()

  try {
    const resultIds: string[] = []

    await session.withTransaction(async (session) => {
      // 1. Auth Check (Identic cu createInvoice)
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      // 2. Preluare Setări Companie (Snapshot Proaspăt) - (Identic cu createInvoice)
      const companySettings = await getSetting()
      if (!companySettings)
        throw new Error('Setările companiei nu sunt configurate.')
      const companySnapshot = buildCompanySnapshot(companySettings)

      // 3. Pregătirea Configurației Clienților (Snapshot Proaspăt) - (Identic cu createInvoice, dar x N)
      const fullSplitConfigs: SplitClientConfig[] = []

      const splitGroupId = new Types.ObjectId()

      for (const config of data.splitConfigs) {
        const client = (await ClientModel.findById(config.clientId)
          .lean()
          .session(session)) as IClientDoc | null

        if (!client)
          throw new Error(`Clientul cu ID ${config.clientId} nu a fost găsit.`)

        fullSplitConfigs.push({
          clientId: config.clientId,
          percentage: config.percentage,
          clientSnapshot: {
            name: client.name,
            cui: client.vatId || client.cnp || '',
            regCom: client.nrRegComert || '',
            bank: client.bankAccountLei?.bankName || '',
            iban: client.bankAccountLei?.iban || '',
            address: {
              judet: client.address.judet,
              localitate: client.address.localitate,
              strada: client.address.strada,
              numar: client.address.numar || '',
              codPostal: client.address.codPostal,
              tara: client.address.tara || 'RO',
              alteDetalii: client.address.alteDetalii || '',
            },
          },
        })
      }

      // 4. Preluare Avize Sursă și Calcul Metadate Logistice
      // (Replică logica din createInvoice unde se caută sourceNotes)
      const sourceNoteIds = data.commonData.sourceDeliveryNotes || []
      let logisticSnapshots = {
        orderNumbers: [] as string[],
        deliveryNumbers: [] as string[],
        deliveryNoteNumbers: [] as string[],
      }
      let relatedOrderIds: Types.ObjectId[] = []
      let relatedDeliveryIds: Types.ObjectId[] = []

      let allUITs = ''
      let allDrivers = ''
      let allVehicles = ''
      let allTrailers = ''

      if (sourceNoteIds.length > 0) {
        const sourceNotes = await DeliveryNoteModel.find({
          _id: { $in: sourceNoteIds },
        })
          .select(
            'orderNumberSnapshot deliveryNumberSnapshot seriesName noteNumber orderId deliveryId uitCode driverName vehicleNumber vehicleType trailerNumber',
          )
          .lean()
          .session(session)

        const orderNumbers = [
          ...new Set(sourceNotes.map((n) => n.orderNumberSnapshot)),
        ]
        const deliveryNumbers = [
          ...new Set(sourceNotes.map((n) => n.deliveryNumberSnapshot)),
        ]
        const deliveryNoteNumbers = [
          ...new Set(sourceNotes.map((n) => `${n.seriesName}-${n.noteNumber}`)),
        ]

        allUITs = [
          ...new Set(sourceNotes.map((n) => n.uitCode).filter(Boolean)),
        ].join(', ')
        allDrivers = [
          ...new Set(sourceNotes.map((n) => n.driverName).filter(Boolean)),
        ].join(' / ')
        allVehicles = [
          ...new Set(sourceNotes.map((n) => n.vehicleNumber).filter(Boolean)),
        ].join(' / ')
        allTrailers = [
          ...new Set(sourceNotes.map((n) => n.trailerNumber).filter(Boolean)),
        ].join(' / ')

        // Convertim string -> ObjectId pentru referințe
        relatedOrderIds = [...new Set(sourceNotes.map((n) => n.orderId))].map(
          (id) => new Types.ObjectId(id),
        )
        relatedDeliveryIds = [
          ...new Set(sourceNotes.map((n) => n.deliveryId)),
        ].map((id) => new Types.ObjectId(id))

        logisticSnapshots = {
          orderNumbers,
          deliveryNumbers,
          deliveryNoteNumbers,
        }
      }

      // 5. Generare Input-uri Facturi (Logica Matematică)
      const invoiceInputs = generateSplitInvoiceInputs(
        data.commonData,
        data.originalItems,
        fullSplitConfigs,
      )

      // 6. Iterare și Salvare Facturi
      for (const invoiceData of invoiceInputs) {
        // A. Generare Număr (Consecutiv pentru fiecare factură din serie)
        const nextSeq = await generateNextDocumentNumber(
          invoiceData.seriesName,
          { session },
        )
        const invoiceNumber = String(nextSeq).padStart(5, '0')
        const year = new Date(invoiceData.invoiceDate).getFullYear()

        // B. Creare Obiect Mongoose
        // Aici mapăm TOATE câmpurile din schema IInvoiceDoc
        const [createdInvoice] = await InvoiceModel.create(
          [
            {
              ...invoiceData,
              // --- Câmpuri Generate de Sistem ---
              sequenceNumber: nextSeq,
              invoiceNumber: invoiceNumber,
              year: year,
              companySnapshot: companySnapshot, // Folosim snapshot-ul proaspăt generat

              // --- Status & Audit ---
              status: 'CREATED',
              eFacturaStatus: 'PENDING',
              createdBy: new Types.ObjectId(userId),
              createdByName: userName,

              // --- Referințe Obligatorii (Mapare ObjectId) ---
              clientId: new Types.ObjectId(invoiceData.clientId),
              deliveryAddress: invoiceData.deliveryAddress,
              deliveryAddressId: new Types.ObjectId(
                invoiceData.deliveryAddressId,
              ),
              salesAgentId: new Types.ObjectId(invoiceData.salesAgentId),
              salesAgentSnapshot: invoiceData.salesAgentSnapshot || {
                name: 'Agent Necunoscut',
              },

              // --- Array-uri de Referințe (Fix pentru TypeScript) ---
              sourceDeliveryNotes: (invoiceData.sourceDeliveryNotes || []).map(
                (id: string) => new Types.ObjectId(id),
              ),
              relatedOrders: relatedOrderIds, // Folosim ce am calculat la pasul 4
              relatedDeliveries: relatedDeliveryIds, // Folosim ce am calculat la pasul 4
              relatedInvoiceIds: [], // Split-ul nu e storno, deci e gol
              relatedAdvanceIds: [], // Momentan gol (logica de avans e separată)

              // --- Snapshots Logistice ---
              logisticSnapshots: logisticSnapshots, // Folosim ce am calculat la pasul 4
              notes: invoiceData.notes,
              orderNotesSnapshot: invoiceData.orderNotesSnapshot,
              deliveryNotesSnapshot: invoiceData.deliveryNotesSnapshot,

              // --- Detalii Transport ---
              driverName: invoiceData.driverName || allDrivers,
              vehicleNumber: invoiceData.vehicleNumber || allVehicles,
              vehicleType: invoiceData.vehicleType, 
              trailerNumber: invoiceData.trailerNumber || allTrailers,
              uitCode: invoiceData.uitCode || allUITs,

              // --- Plăți (Default) ---
              paidAmount: 0,
              remainingAmount: invoiceData.totals.grandTotal,
              splitGroupId: splitGroupId,
            },
          ],
          { session },
        )

        resultIds.push(createdInvoice._id.toString())

        // C. Actualizare Documente Conexe (Avize, Comenzi)
        // Funcția asta face $push în relatedInvoices, deci suportă multiple facturi
        await updateRelatedDocuments(createdInvoice, {}, { session })
      }
    })

    await session.endSession()

    return {
      success: true,
      message: `${resultIds.length} facturi au fost generate cu succes.`,
      invoiceIds: resultIds,
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createSplitInvoices:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function cancelSplitGroup(
  splitGroupId: string,
  reason: string,
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase()
  const session = await startSession()

  try {
    await session.withTransaction(async (session) => {
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

      // 1. Găsim TOATE facturile din grup (Nu filtrăm statusul aici!)
      const allGroupInvoices = await InvoiceModel.find({
        splitGroupId: splitGroupId,
      }).session(session)

      if (allGroupInvoices.length === 0) {
        throw new Error('Nu au fost găsite facturi în acest grup.')
      }

      // 2. VALIDARE ATOMICĂ (Totul sau Nimic)
      // Dacă UNA SINGURĂ e într-un stadiu final, blocăm tot procesul.
      for (const inv of allGroupInvoices) {
        // A. Validare e-Factura
        if (['SENT', 'ACCEPTED'].includes(inv.eFacturaStatus)) {
          throw new Error(
            `Eroare Critică: Factura ${inv.invoiceNumber} este deja transmisă în SPV. Grupul nu poate fi anulat automat.`,
          )
        }

        // B. Validare Status Intern
        // Dacă e deja ANULATĂ, PLĂTITĂ sau APROBATĂ -> Stop.
        if (
          ['PAID', 'PARTIAL_PAID', 'APPROVED', 'CANCELLED'].includes(inv.status)
        ) {
          throw new Error(
            `Eroare Critică: Factura ${inv.invoiceNumber} are statusul "${inv.status}". Grupul nu poate fi anulat automat.`,
          )
        }
      }

      // Dacă am ajuns aici, toate facturile sunt curate (CREATED/DRAFT).
      const invoiceIds = allGroupInvoices.map((i) => i._id)

      // 3. ANULARE FACTURI
      await InvoiceModel.updateMany(
        { _id: { $in: invoiceIds } },
        {
          $set: {
            status: 'CANCELLED',
            eFacturaStatus: 'NOT_REQUIRED',
            notes: `Grup de split anulat integral de ${authSession.user.name}. Motiv: ${reason}`,
            cancellationReason: reason,
            cancelledBy: authSession.user.id,
            cancelledByName: authSession.user.name,
            cancelledAt: new Date(),
          },
        },
        { session },
      )

      // 4. DECUPLARE DOCUMENTE (Avize & Livrări)
      // Folosim lista completă de ID-uri pentru a curăța referințele
      const allSourceDeliveryNoteIds = allGroupInvoices.flatMap(
        (i) => i.sourceDeliveryNotes || [],
      )
      const allRelatedDeliveryIds = allGroupInvoices.flatMap(
        (i) => i.relatedDeliveries || [],
      )

      // A. Curățare Avize
      if (allSourceDeliveryNoteIds.length > 0) {
        await DeliveryNoteModel.updateMany(
          { _id: { $in: allSourceDeliveryNoteIds } },
          {
            $pull: {
              // Scoatem obiectele care referă oricare din facturile anulate
              relatedInvoices: { invoiceId: { $in: invoiceIds } },
            },
            $set: {
              isInvoiced: false,
              status: 'DELIVERED', // Revin la statusul livrat, gata de refacturare
            },
          },
          { session },
        )
      }

      // B. Curățare Livrări
      if (allRelatedDeliveryIds.length > 0) {
        await DeliveryModel.updateMany(
          { _id: { $in: allRelatedDeliveryIds } },
          {
            $pull: {
              relatedInvoices: { invoiceId: { $in: invoiceIds } },
            },
            $set: {
              isInvoiced: false,
              status: 'DELIVERED',
            },
          },
          { session },
        )
      }
    })

    await session.endSession()
    return {
      success: true,
      message:
        'Grupul a fost anulat complet. Avizele sunt disponibile pentru refacturare.',
    }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    console.error('Eroare cancelSplitGroup:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function getSplitGroupPreview(splitGroupId: string) {
  await connectToDatabase()
  try {
    const invoices = await InvoiceModel.find({ splitGroupId })
      .select(
        'invoiceNumber invoiceDate clientSnapshot.name totals.grandTotal currency',
      )
      .lean()

    // Serializăm datele pentru frontend
    const plainInvoices = invoices.map((inv) => ({
      id: inv._id.toString(),
      number: inv.invoiceNumber,
      date: inv.invoiceDate
        ? new Date(inv.invoiceDate).toLocaleDateString('ro-RO')
        : '-',
      clientName: inv.clientSnapshot?.name || 'Client Necunoscut',
      total: inv.totals?.grandTotal || 0,
      currency: (inv as any).currency || 'RON', // Fallback currency
    }))

    return { success: true, data: plainInvoices }
  } catch (error) {
    console.error('Error fetching group preview:', error)
    return { success: false, data: [] }
  }
}
