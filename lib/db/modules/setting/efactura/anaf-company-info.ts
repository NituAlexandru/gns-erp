'use server'

import { ANAF_TVA_ENDPOINT } from '@/lib/constants'

// --- 1. HELPER: Title Case ---
function toTitleCase(str: string) {
  if (!str) return ''
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

// --- 2. HELPER: Curățare Simplă ---
function simpleClean(text: string): string {
  let clean = text.trim()
  // Scoatem prefixele uzuale
  clean = clean.replace(/\b(Sat|Com|Mun|Ors|Jud)\b\.?/gi, '')
  // Scoatem semne de punctuație și spații duble
  clean = clean.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim()
  return toTitleCase(clean)
}

// --- 3. HELPER: Logică Avansată Localitate + Extra Detalii ---
function parseLocality(text: string | undefined | null): {
  localitate: string
  extra: string
} {
  if (!text) return { localitate: '', extra: '' }

  // FIX 1: Folosim const pentru că nu modificăm variabila raw
  const raw = text.trim()

  // CAZ 1: BUCUREȘTI (Sector X)
  if (/Sector\s+\d/i.test(raw)) {
    const match = raw.match(/(Sector\s+\d)/i)
    return {
      localitate: match ? toTitleCase(match[0]) : 'Bucuresti',
      extra: '',
    }
  }

  // CAZ 2: RURAL (Sat ... Com. ...)
  const ruralMatch = raw.match(/Sat\.?\s+(.+?)\s+Com/i)

  if (ruralMatch) {
    const satName = ruralMatch[1].trim()
    const comMatch = raw.match(/Com\.?\s+(.+)/i)
    const comName = comMatch ? comMatch[1].trim() : ''

    return {
      localitate: toTitleCase(satName),
      extra: comName ? `Com. ${toTitleCase(comName)}` : '',
    }
  }

  // CAZ 3: ORAȘE / STANDARD
  return {
    localitate: simpleClean(raw),
    extra: '',
  }
}

// --- 4. HELPER: Curățare Stradă ---
function cleanStreet(text: string | undefined | null): string {
  if (!text || text.trim() === '') return ''
  let clean = text.trim()

  if (clean.length < 2) return ''

  clean = clean.replace(/\b(Sat|Com|Mun|Ors)\b\.?/gi, '')
  clean = clean.replace(/^(Str\.|Strada|Bd\.|Bulevardul|Al\.|Aleea)\s+/gi, '')
  clean = clean.replace(/\s+/g, ' ').trim()
  return toTitleCase(clean)
}

// --- 5. HELPER: Țară ---
function determineCountryCode(
  anafCountryName: string | undefined | null
): string {
  if (!anafCountryName) return 'RO'

  const upper = anafCountryName.toUpperCase().trim()

  if (upper === 'ROMANIA' || upper === 'RO' || upper === '') return 'RO'

  // FIX 2: Folosim variabila 'upper' care este definită, nu 'normalized'
  if (upper.length === 2) return upper

  return 'RO'
}

// --- MAIN FUNCTION ---
export async function getCompanyDataByCui(cui: string) {
  try {
    const cleanCui = cui.replace(/\D/g, '')
    const today = new Date().toISOString().split('T')[0]

    const response = await fetch(ANAF_TVA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify([{ cui: cleanCui, data: today }]),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Eroare comunicare ANAF (HTTP ${response.status})`)
    }

    const data = await response.json()
    console.log('--- RĂSPUNS RAW ANAF V9 ---')
    console.log(JSON.stringify(data, null, 2))

    if (!data.found || data.found.length === 0) {
      return {
        success: false,
        message: 'CUI invalid sau firma nu a fost găsită.',
      }
    }

    const f = data.found[0]
    const dg = f.date_generale

    if (!dg) {
      return {
        success: false,
        message: 'Firma există, dar datele sunt incomplete.',
      }
    }

    const addr = f.adresa_sediu_social || f.adresa_domiciliu_fiscal || {}
    const tva = f.inregistrare_scop_Tva

    const rawJudet = addr.sdenumire_Judet || addr.ddenumire_Judet || ''
    const rawLocalitate =
      addr.sdenumire_Localitate || addr.ddenumire_Localitate || ''
    const rawStrada = addr.sdenumire_Strada || addr.ddenumire_Strada || ''
    const rawNumar = addr.snumar_Strada || addr.dnumar_Strada || ''
    // Aici declaram variabila corectă:
    const rawDetaliiAPI = addr.sdetalii_Adresa || addr.ddetalii_Adresa || ''
    const rawTara = addr.stara || addr.dtara || ''

    // 1. Procesăm localitatea (separăm satul de comună)
    const { localitate, extra } = parseLocality(rawLocalitate)

    // 2. Construim "Alte detalii" final
    // FIX 3: Folosim rawDetaliiAPI (numele corect al variabilei)
    let finalDetalii = rawDetaliiAPI
    if (extra) {
      finalDetalii = finalDetalii ? `${extra}, ${finalDetalii}` : extra
    }

    // 3. Normalizăm Județ București
    let finalJudet = toTitleCase(rawJudet)
    if (finalJudet.toUpperCase().includes('BUCURESTI')) {
      finalJudet = 'Bucuresti'
    }

    return {
      success: true,
      data: {
        name: dg.denumire,
        nrRegCom: dg.nrRegCom,
        isVatPayer: !!(tva && tva.scpTVA === true),
        address: {
          judet: finalJudet,
          localitate: localitate,
          strada: cleanStreet(rawStrada),
          numar: rawNumar,
          codPostal: addr.scod_Postal || addr.dcod_Postal || dg.codPostal || '',
          alteDetalii: finalDetalii,
          tara: determineCountryCode(rawTara),
        },
      },
    }
  } catch (error: any) {
    console.error('[BACKEND ERROR]:', error.message)
    return {
      success: false,
      message: 'Serverul ANAF (v9) nu a putut fi accesat.',
    }
  }
}
