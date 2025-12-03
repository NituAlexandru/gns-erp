// --- 1. MAPARE JUDEȚE (RO-CIUS) ---

import { PaymentMethodKey } from '../../../financial/treasury/payment.constants'

// Normalizăm inputul (fără diacritice, lowercase) pentru a găsi codul corect.
export const RO_COUNTIES_MAP: Record<string, string> = {
  alba: 'RO-AB',
  arad: 'RO-AR',
  arges: 'RO-AG',
  bacau: 'RO-BC',
  bihor: 'RO-BH',
  bistritanasaud: 'RO-BN',
  botosani: 'RO-BT',
  brasov: 'RO-BV',
  braila: 'RO-BR',
  bucuresti: 'RO-B',
  buzau: 'RO-BZ',
  carasseverin: 'RO-CS',
  calarasi: 'RO-CL',
  cluj: 'RO-CJ',
  constanta: 'RO-CT',
  covasna: 'RO-CV',
  dambovita: 'RO-DB',
  dolj: 'RO-DJ',
  galati: 'RO-GL',
  giurgiu: 'RO-GR',
  gorj: 'RO-GJ',
  harghita: 'RO-HR',
  hunedoara: 'RO-HD',
  ialomita: 'RO-IL',
  iasi: 'RO-IS',
  ilfov: 'RO-IF',
  maramures: 'RO-MM',
  mehedinti: 'RO-MH',
  mures: 'RO-MS',
  neamt: 'RO-NT',
  olt: 'RO-OT',
  prahova: 'RO-PH',
  satumare: 'RO-SM',
  salaj: 'RO-SJ',
  sibiu: 'RO-SB',
  suceava: 'RO-SV',
  teleorman: 'RO-TR',
  timis: 'RO-TM',
  tulcea: 'RO-TL',
  vaslui: 'RO-VS',
  valcea: 'RO-VL',
  vrancea: 'RO-VN',
}

export const getCountyCode = (countyName?: string): string => {
  if (!countyName) return 'RO-B' // Fallback
  // Eliminăm diacriticele și spațiile, facem lowercase
  const normalized = countyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')

  return RO_COUNTIES_MAP[normalized] || 'RO-B'
}

// --- 2. MAPARE METODE DE PLATĂ (BT-81) ---
export const PAYMENT_METHOD_TO_ANAF: Record<PaymentMethodKey, string> = {
  ORDIN_DE_PLATA: '42', // Payment to bank account
  CARD: '48', // Bank Card
  CASH: '10', // Cash
  BILET_LA_ORDIN: '20', // Cheque
  COMPENSARE: '97', // Clearing
  ALTUL: '1', // Instrument not defined
}

// --- 3. CODURI TAXE (ClassifiedTaxCategory) ---
export const VAT_CATEGORY_CODES = {
  STANDARD: 'S', // 19%, 9%, 5% Cazul general. Vânzări normale de bunuri și servicii în țară. Este SINGURUL cod care acceptă o valoare pozitivă a TVA-ului.
  ZERO: 'Z', // 0% (Zero Rated - ex: intra-comunitar cu drept de deducere)Scutit CU drept de deducere. (Z = Zero rated). Este o nuanță fină față de E. Se aplică des la transport internațional legat de exporturi sau livrări către organisme internaționale.
  EXEMPT: 'E', // 0% (Scutit - ex: servicii medicale, neplătitori TVA). Fără drept de deducere.
  REVERSE: 'AE', // 0% (Taxare Inversă - ex: construcții, cereale) B2B specific. Cumpărătorul plătește TVA-ul (nu vânzătorul).
  INTRACOMMUNITY: 'K', // 0% (FIX) Livrări Intracomunitare (LIC) Când vinzi bunuri unei firme din altă țară UE care are cod valid de TVA (VIES).
  EXPORT: 'G', // Export 0% (Fix)	Livrări Extracomunitare (LEC). Când vinzi bunuri în afara UE (ex: Moldova, SUA, China).
}
export type VatCategoryCode =
  (typeof VAT_CATEGORY_CODES)[keyof typeof VAT_CATEGORY_CODES]

// Mapare pentru UI (Dropdown)
export const VAT_CATEGORY_OPTIONS = [
  { value: 'S', label: '(S) - Standard' },
  { value: 'AE', label: '(AE) - Taxare Inversă' },
  { value: 'E', label: '(E) - Scutit' },
  { value: 'Z', label: '(Z) - Fara TVA' },
  { value: 'G', label: '(G) - Export' },
  { value: 'K', label: '(K) - Livrări intracomunitare' },
]

export const VAT_EXEMPTION_REASONS: Record<string, string> = {
  S: '', // Standard - nu necesită motiv
  AE: 'Taxare inversă conform Art. 331 din Codul Fiscal',
  E: 'Scutit de TVA fără drept de deducere',
  Z: 'Scutit de TVA cu drept de deducere',
  G: 'Scutit cu drept de deducere - Export (Art. 294)',
  K: 'Scutit cu drept de deducere - Livrare Intracomunitară (Art. 294)',
}
