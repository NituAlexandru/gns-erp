import { UNITS } from '../constants'

// Tipul pentru unitățile de măsură interne, derivat din lista de mai sus
export type InternalUoM = (typeof UNITS)[number]

/**
 * Harta de corespondență între unitățile de măsură interne
 * și codurile oficiale cerute de standardul RO e-Factura (UNECE Rec. 20).
 */
const uomToEFacturaMap: Record<InternalUoM, string> = {
  bucata: 'H87',
  kg: 'KGM',
  litru: 'LTR',
  m2: 'MTK',
  m3: 'MTQ',
  ml: 'MLT',
  palet: 'PX',
  set: 'SET',
  cutie: 'BX',
  bax: 'CS',
  rola: 'RO',
  sac: 'BG',
  punga: 'BG', // 'punga' și 'sac' au același cod standard
  balot: 'BE',
  colac: 'CL',
}

/**
 * Funcție ajutătoare pentru a obține codul e-Factura pe baza unității interne.
 * @param uom Unitatea de măsură internă (ex: 'bucata')
 * @returns Codul e-Factura corespunzător (ex: 'H87') sau un string gol dacă nu se găsește.
 */
export const getEFacturaUomCode = (uom: InternalUoM | string): string => {
  return uomToEFacturaMap[uom as InternalUoM] || ''
}
