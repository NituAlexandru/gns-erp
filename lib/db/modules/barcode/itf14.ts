import bwipjs from 'bwip-js'

/**
 * Generează un ITF-14 (folosit în ambalaje, 14 cifre).
 */
export async function genITF14(payload14: string): Promise<string> {
  if (!/^\d{14}$/.test(payload14)) {
    throw new Error('ITF-14 payload must be exactly 14 digits')
  }
  const png = await bwipjs.toBuffer({
    bcid: 'itf14',
    text: payload14,
    includetext: true,
    scale: 3,
    height: 15,
    textxalign: 'center',
  })
  return `data:image/png;base64,${png.toString('base64')}`
}
// Client-side
// ITF-14 (14 cifre)
// <Barcode text={package.itf14} type="itf14" />