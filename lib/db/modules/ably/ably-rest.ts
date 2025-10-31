import Ably from 'ably'

if (!process.env.ABLY_API_KEY) {
  throw new Error('Missing ABLY_API_KEY environment variable')
}

const ablyRest = new Ably.Rest(process.env.ABLY_API_KEY)

export default ablyRest
