import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCODING = 'hex'
const IV_LENGTH = 16
const KEY = process.env.ENCRYPTION_KEY || ''

if (!KEY || KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long in .env')
}

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(KEY.slice(0, 32)),
    iv
  )
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return {
    iv: iv.toString(ENCODING),
    data: encrypted.toString(ENCODING),
  }
}

export const decrypt = (text: string, iv: string) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(KEY.slice(0, 32)),
    Buffer.from(iv, ENCODING)
  )
  let decrypted = decipher.update(Buffer.from(text, ENCODING))
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
