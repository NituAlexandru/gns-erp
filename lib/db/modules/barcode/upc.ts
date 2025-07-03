import bwipjs from 'bwip-js'

/**
 * Generează un UPC-A valid (12 cifre, cifra de control inclusă).
 */
export async function genUPCA(payload11: string): Promise<string> {
  if (!/^\d{11}$/.test(payload11)) {
    throw new Error('UPC-A payload must be exactly 11 digits')
  }
  const png = await bwipjs.toBuffer({
    bcid: 'upca',
    text: payload11,
    includetext: true,
    scale: 3,
    height: 10,
    textxalign: 'center',
  })
  return `data:image/png;base64,${png.toString('base64')}`
}
// Client-side
// // UPC-A (11 cifre + control)
// <Barcode text={product.upc11} type="upca" />
