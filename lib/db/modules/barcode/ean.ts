import bwipjs from 'bwip-js'
declare module 'bwip-js'
/**
 * Generează un EAN-13 valid GS1.
 * 🔸 `payload12` e sirul de 12 cifre ce include prefixul de țară GS1 (ex: "642…")
 * 🔸 Bibliotecă calculează tușul de control automat.
 */
export async function genEAN13(payload12: string): Promise<string> {
  if (!/^\d{12}$/.test(payload12)) {
    throw new Error('EAN-13 payload must be exactly 12 digits')
  }
  const png = await bwipjs.toBuffer({
    bcid: 'ean13',
    text: payload12,
    includetext: true,
    scale: 3,
    height: 10,
    textxalign: 'center',
  })
  return `data:image/png;base64,${png.toString('base64')}`
}

// Client-side
// // EAN-13 (12 cifre + cifra de control – 642… pentru România)
// <Barcode text={product.ean12} type="ean13" width={200} height={80} />
