import Ably from 'ably'

if (!process.env.ABLY_API_KEY) {
  throw new Error('Missing ABLY_API_KEY environment variable')
}

/**
 * FABRICĂ PENTRU CLIENTUL ABLY REST
 * * Această funcție creează o NOUĂ instanță a clientului Ably
 * de fiecare dată când este apelată.
 * * NU exporta niciodată o instanță 'new Ably.Rest()' direct
 * dintr-un fișier partajat. Acest lucru creează un singleton global
 * care cauzează timeout-uri de conexiune în mediile Serverless (Vercel).
 */
export function getAblyRest() {
  // Creează o instanță proaspătă de fiecare dată
  return new Ably.Rest(process.env.ABLY_API_KEY!)
}
