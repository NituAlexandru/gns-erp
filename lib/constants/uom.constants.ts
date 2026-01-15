import { UNITS } from '../constants'

// Tipul pentru unitățile de măsură interne, derivat din lista de mai sus
export type InternalUoM = (typeof UNITS)[number]

/**
 * Harta de corespondență între unitățile de măsură interne
 * și codurile oficiale cerute de standardul RO e-Factura (UNECE Rec. 20).
 */
export const uomToEFacturaMap: Record<InternalUoM, string> = {
  bucata: 'H87',
  kg: 'KGM',
  litru: 'LTR',
  m2: 'MTK',
  m3: 'MTQ',
  ml: 'MTR',
  palet: 'NAR', // PX, NAR
  set: 'SET',
  cutie: 'BX',
  bax: 'CS',
  rola: 'RO',
  sac: 'H87',
  punga: 'BG', // 'punga' și 'sac' au același cod standard
  balot: 'BE',
  colac: 'CL',
}

// 2. Harta pentru IMPORT (ANAF -> Intern) - Aici e magia (Many-to-One)
export const eFacturaToInternalMap: Record<string, InternalUoM> = {
  // --- Standarde Comune ---
  H87: 'bucata', // Piece
  C62: 'bucata', // One / Unit (sinonim H87)
  EA: 'bucata', // Each
  XPP: 'bucata', // Piece (Dedeman/Hornbach)
  SET: 'set',
  PR: 'set', // Pair (Pereche) -> Set
  NPR: 'set', // Number of pairs -> Set

  // --- Greutăți & Volume ---
  KGM: 'kg', // Kilogram
  '58': 'kg', // Net Kilogram (Oțel)
  TNE: 'kg', // Tona (Atenție: 1 TNE va intra ca 1 KG, necesită ajustare manuală la recepție!)
  NT: 'kg', // Net Ton
  LTR: 'litru', // Litru
  DMQ: 'm3', // Decimetru cub (rar) -> m3 (atenție conversie)
  MTQ: 'm3', // Metru cub
  MTK: 'm2', // Metru pătrat
  MT: 'ml', // Metru
  MTR: 'ml', // Metru
  LM: 'ml', // Linear Meter
  MLT: 'ml', // Mililitru (atenție!) - sau Metru Liniar (confuzie frecventă) -> mapăm la ml

  // --- Ambalaje ---
  PX: 'palet', // Pallet
  NAR: 'palet', // Pallet
  PF: 'palet', // Pallet
  BX: 'cutie', // Box
  CT: 'cutie', // CartonF
  CS: 'bax', // Case
  SA: 'sac', // Sack
  BG: 'sac', // Bag (Pungă/Sac)
  BE: 'balot', // Bundle
  CL: 'colac', // Coil
  RO: 'rola', // Roll

  // --- Servicii & Diverse (Le mapăm la 'bucata' generic) ---
  M4: 'bucata', // Monetary Value (Servicii, Ajustări)
  IE: 'bucata', // Person (Manoperă)
  HUR: 'bucata', // Hour (Ore manoperă)
  DAY: 'bucata', // Zi
  MON: 'bucata', // Lună (Abonamente)
  KMT: 'bucata', // Kilometru (Transport) - sau 'ml' dacă preferi
  LS: 'bucata', // Lump Sum (Paușal)
}

/**
 * Helper pentru a găsi unitatea internă, indiferent de case-sensitivity
 */
export const getInternalUom = (anafCode: string): InternalUoM | null => {
  if (!anafCode) return 'bucata' // Fallback default
  const code = anafCode.toUpperCase().trim()
  return eFacturaToInternalMap[code] || null
}

/**
 * Funcție ajutătoare pentru a obține codul e-Factura pe baza unității interne.
 * @param uom Unitatea de măsură internă (ex: 'bucata')
 * @returns Codul e-Factura corespunzător (ex: 'H87') sau un string gol dacă nu se găsește.
 */
export const getEFacturaUomCode = (uom: InternalUoM | string): string => {
  return uomToEFacturaMap[uom as InternalUoM] || ''
}
