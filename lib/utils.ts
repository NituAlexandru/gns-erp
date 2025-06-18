import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { addBusinessDays } from './deliveryDates'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatNumberWithDecimal = (num: number): string => {
  const [int, decimal] = num.toString().split('.')
  return decimal ? `${int}.${decimal.padEnd(2, '0')}` : int
}
export const toSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')

const CURRENCY_FORMATTER = new Intl.NumberFormat('ro-RO', {
  currency: 'RON',
  style: 'currency',
  minimumFractionDigits: 2,
})

export function formatCurrency(amount: number) {
  return CURRENCY_FORMATTER.format(amount)
}

const NUMBER_FORMATTER = new Intl.NumberFormat('ro-RO')

export function formatNumber(number: number) {
  return NUMBER_FORMATTER.format(number)
}

export const round2 = (num: number) =>
  Math.round((num + Number.EPSILON) * 100) / 100

export const generateId = () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 10)).join('')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatError = (error: any): string => {
  if (error.name === 'ZodError') {
    const fieldErrors = Object.keys(error.errors).map((field) => {
      const errorMessage = error.errors[field].message
      return `${error.errors[field].path}: ${errorMessage}` // field: errorMessage
    })
    return fieldErrors.join('. ')
  } else if (error.name === 'ValidationError') {
    const fieldErrors = Object.keys(error.errors).map((field) => {
      const errorMessage = error.errors[field].message
      return errorMessage
    })
    return fieldErrors.join('. ')
  } else if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyValue)[0]
    return `${duplicateField} already exists`
  } else {
    // return 'Something went wrong. please try again'
    return typeof error.message === 'string'
      ? error.message
      : JSON.stringify(error.message)
  }
}
export const normalizeStringForComparison = (str: string): string => {
  if (!str) return ''
  return str
    .toLowerCase() // 1. Litere mici
    .normalize('NFD') // 2. Descompune diacriticele (ex: 'ă' -> 'a' + '˘')
    .replace(/[\u0300-\u036f]/g, '') // 3. Elimină semnele diacritice
    .replace(/\s+/g, '') // 4. Elimină toate spațiile
}
export function calculateFutureDate(days: number): Date {
  const now = new Date()

  // ora de tăiere în ziua curentă: 15:00
  const cutoff = new Date(now)
  cutoff.setHours(15, 0, 0, 0)

  // Dacă suntem după ora de tăiere, începem de mâine (prima zi lucrătoare)
  const baseDate = now > cutoff ? addBusinessDays(now, 1) : now

  // Apoi adăugăm zilele de livrare peste această bază
  return addBusinessDays(baseDate, days)
}
