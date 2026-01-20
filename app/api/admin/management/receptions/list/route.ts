import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ReceptionModel from '@/lib/db/modules/reception/reception.model'
import Supplier from '@/lib/db/modules/suppliers/supplier.model' // <--- IMPORTĂ MODELUL SUPPLIER
import mongoose from 'mongoose'
import { PAGE_SIZE } from '@/lib/constants'
import '@/lib/db/modules/user/user.model'

export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(
      url.searchParams.get('pageSize') || String(PAGE_SIZE),
      10,
    )
    const status = url.searchParams.get('status')
    const createdBy = url.searchParams.get('createdBy')
    const q = url.searchParams.get('q') || '' // <--- 1. PRELUĂM PARAMETRUL DE CĂUTARE

    // Construim obiectul de filtrare
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {}

    if (status && status !== 'ALL') filter.status = status
    if (
      createdBy &&
      createdBy !== 'ALL' &&
      mongoose.isValidObjectId(createdBy)
    ) {
      filter.createdBy = createdBy
    }

    // --- LOGICA DE CĂUTARE AVANSATĂ (SEARCH) ---
    if (q) {
      const regex = new RegExp(q, 'i') // Case insensitive

      // A. Căutăm Furnizorii care au numele asemănător cu 'q'
      // Trebuie să obținem ID-urile lor, deoarece în Recepție e salvat doar ID-ul
      const matchingSuppliers = await Supplier.find({
        name: regex,
      }).select('_id')

      const supplierIds = matchingSuppliers.map((s) => s._id)

      // B. Construim condiția OR:
      // - Ori numele furnizorului se potrivește (prin ID)
      // - Ori numărul NIR conține textul
      // - Ori numărul unei facturi atașate conține textul
      // - Ori seria unui aviz conține textul
      filter.$or = [
        { supplier: { $in: supplierIds } }, // Căutare după Nume Furnizor
        { nirNumber: regex }, // Căutare după Număr NIR
        { 'invoices.number': regex }, // Căutare după Nr Factură
        { 'deliveries.dispatchNoteSeries': regex }, // Căutare după Serie Aviz
        { 'deliveries.dispatchNoteNumber': regex }, // Căutare după Număr Aviz
      ]
    }

    // Calculăm numărul total
    const total = await ReceptionModel.countDocuments(filter)

    // Preluăm datele
    const data = await ReceptionModel.find(filter)
      .populate('supplier', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    return NextResponse.json({
      data,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[RECEPTIONS_LIST_ERROR]', error)
    return NextResponse.json(
      { message: 'Eroare internă de server' },
      { status: 500 },
    )
  }
}
