import bwipjs from 'bwip-js'

/**
 * Generează un GS1-128. Poți include AI-uri (ex: "(01)123…(17)YYMMDD…").
 */
export async function genGS1128(text: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: 'gs1-128',
    text,
    includetext: true,
    scale: 3,
    height: 10,
    textxalign: 'center',
  })
  return `data:image/png;base64,${png.toString('base64')}`
}
// Client-side
// GS1-128 (poți include AI-uri, ex. "(01)123…(17)YYMMDD…")
// <Barcode text={order.gs1data} type="gs1128" />
