'use server'

import { XMLParser } from 'fast-xml-parser'

// Cache simplu în memorie (1 oră)
let cachedRates: Record<string, number> | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 1000 * 60 * 60

export async function getBNRRates() {
  const now = Date.now()

  // Returnăm din cache dacă e proaspăt
  if (cachedRates && now - lastFetchTime < CACHE_DURATION) {
    return { success: true, data: cachedRates }
  }

  try {
    const response = await fetch('https://www.bnr.ro/nbrfxrates.xml', {
      next: { revalidate: 3600 },
    })

    if (!response.ok) throw new Error('Nu s-a putut contacta BNR.')

    const xmlText = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const result = parser.parse(xmlText)

    const ratesArray = result.DataSet.Body.Cube.Rate
    const rates: Record<string, number> = {}

    // RON e baza
    rates['RON'] = 1

    ratesArray.forEach((rateObj: any) => {
      const currency = rateObj['@_currency']
      const value = parseFloat(rateObj['#text'])
      const multiplier = rateObj['@_multiplier']
        ? parseFloat(rateObj['@_multiplier'])
        : 1

      if (currency && value) {
        rates[currency] = value / multiplier
      }
    })

    cachedRates = rates
    lastFetchTime = now

    return { success: true, data: rates }
  } catch (error) {
    console.error('Eroare BNR:', error)
    return { success: false, message: 'Cursul nu a putut fi preluat.' }
  }
}
