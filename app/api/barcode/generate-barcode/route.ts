import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import Product from '@/lib/db/modules/product/product.model'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()

    let isUnique = false
    let newCode = ''
    let attempts = 0

    // Încercăm să generăm un cod unic.
    while (!isUnique && attempts < 10) {
      // Generăm partea aleatoare: 8 caractere alfanumerice UpperCase
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()

      // Punem prefixul INT ca să știm că e generat intern
      newCode = `INT${randomPart}`

      // Verificăm dacă există deja în DB
      const existingProduct = await Product.findOne({
        barCode: newCode,
      }).select('_id')

      if (!existingProduct) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return NextResponse.json(
        { success: false, message: 'Nu s-a putut genera un cod unic.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: newCode,
    })
  } catch (error: any) {
    console.error('Eroare generare barcode:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Eroare server' },
      { status: 500 }
    )
  }
}
