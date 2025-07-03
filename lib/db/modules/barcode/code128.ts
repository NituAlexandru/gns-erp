import bwipjs from 'bwip-js'

/**
 * Generează un Code128 general (alfanumeric).
 * Ideal pentru furnizori, clienţi, vehicule (ID Mongo etc).
 */
export interface Code128Options {
  backgroundcolor?: string
  barcolor?: string
}

export async function genCode128(
  text: string,
  opts: Code128Options = {}
): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    includetext: true,
    scale: 5,
    height: 50,
    textxalign: 'center',
    backgroundcolor: 'FFFFFF',
    barcolor: '000000',
    ...opts,
  })
  return `data:image/png;base64,${png.toString('base64')}`
}
// Client-side
// Code128 (alfanumeric)
// <Barcode text={supplier._id} type="code128" />
