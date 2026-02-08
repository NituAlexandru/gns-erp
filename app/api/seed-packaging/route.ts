import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import PackagingModel from '@/lib/db/modules/packaging-products/packaging.model'
import { Types } from 'mongoose'
import { AVAILABLE_PALLET_TYPES } from '@/lib/constants'

// ID-urile tale reale din baza de date
const CATEGORY_IDS = {
  MAIN_AMBALAJE: new Types.ObjectId('686e2eec73bbbfb3cd36b956'), // Categoria "Ambalaje"
  SUB_PALETI: new Types.ObjectId('686e2eff73bbbfb3cd36b964'), // Sub-categoria "Paleti"
}

export async function GET() {
  try {
    await connectToDatabase()

    let updatedCount = 0

    console.log(
      `🚀 Încep restaurarea a ${AVAILABLE_PALLET_TYPES.length} ambalaje...`,
    )

    for (const p of AVAILABLE_PALLET_TYPES) {
      // Construim obiectul complet
      const packagingData = {
        _id: new Types.ObjectId(p.id), // Păstrăm ID-ul original
        slug: p.slug,
        name: p.name,
        description: p.returnConditions,

        // --- CATEGORII (Setate Hardcoded) ---
        category: CATEGORY_IDS.SUB_PALETI, // Sub-categoria
        mainCategory: CATEGORY_IDS.MAIN_AMBALAJE, // Categoria Principală

        suppliers: [], // Array gol, safe

        // --- Imagini & Prețuri ---
        images: [p.image],
        entryPrice: p.custodyFee,
        listPrice: p.custodyFee,
        averagePurchasePrice: p.custodyFee,

        defaultMarkups: {
          markupDirectDeliveryPrice: 0,
          markupFullTruckPrice: 0,
          markupSmallDeliveryBusinessPrice: 0,
          markupRetailPrice: 0,
        },

        // --- Detalii Tehnice ---
        packagingQuantity: 1,
        unit: 'bucata',
        packagingUnit: 'bucata',
        productCode: p.slug.toUpperCase(),
        isPublished: true,

        // --- Dimensiuni Fizice ---
        length: p.lengthCm,
        width: p.widthCm,
        height: p.heightCm,
        volume: p.volumeM3,
        weight: p.weightKg,
      }

      // Upsert - actualizeaza
      // await PackagingModel.findByIdAndUpdate(p.id, packagingData, {
      //   upsert: true,
      //   new: true,
      //   setDefaultsOnInsert: true,
      // })
      // updatedCount++

      // Doar creaza ---------------------------------
      const exists = await PackagingModel.exists({ _id: p.id })

      if (!exists) {
        await PackagingModel.create(packagingData)
        console.log(`✅ Adăugat ambalaj nou: ${p.name}`)
        updatedCount++
      } else {
        console.log(`🟡 Ignorat (există deja): ${p.name}`)
      }

      // pana aici --------------------------------
    }

    return NextResponse.json({
      success: true,
      message: `Seed complet! ${updatedCount} ambalaje restaurate și legate de categoriile "Ambalaje" > "Paleti".`,
    })
  } catch (error: any) {
    console.error('Seed Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
}

// Ruta - http://localhost:3000/api/seed-packaging
