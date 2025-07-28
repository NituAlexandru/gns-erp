import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ProductModel from '@/lib/db/modules/product/product.model'

export async function GET() {
  try {
    await connectToDatabase()

   
    const result = await ProductModel.aggregate([
      // Pasul 1: Încercăm să convertim 'productCode' (string) într-un număr.
      // Folosim $convert pentru a gestiona erorile dacă un cod nu este numeric.
      {
        $addFields: {
          numericCode: {
            $convert: {
              input: '$productCode',
              to: 'int',
              onError: null, // Dacă conversia eșuează, rezultatul va fi null
              onNull: null,
            },
          },
        },
      },
      // Pasul 2: Păstrăm doar documentele unde conversia a reușit
      {
        $match: {
          numericCode: { $ne: null },
        },
      },
      // Pasul 3: Sortăm descrescător după valoarea NUMERICĂ
      {
        $sort: { numericCode: -1 },
      },
      // Pasul 4: Luăm doar primul rezultat (cel mai mare)
      { $limit: 1 },
    ]).exec()

    // Verificăm care este ultimul cod valid. Dacă nu există, pornim de la 9999.
    const lastCode = result.length > 0 ? result[0].numericCode : 9999

    // Ne asigurăm că noul cod este cel puțin 10000
    const newCode = Math.max(lastCode + 1, 10000)

    return NextResponse.json({ success: true, code: newCode.toString() })
  } catch (error) {
    console.error('Eroare la generarea codului:', error)
    return NextResponse.json(
      { success: false, message: 'Eroare la generarea codului' },
      { status: 500 }
    )
  }
}
