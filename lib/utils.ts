import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import qs from 'query-string'

export function formUrlQuery({
  params,
  key,
  value,
}: {
  params: string
  key: string
  value: string | null
}) {
  const currentUrl = qs.parse(params)

  currentUrl[key] = value

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  )
}
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
export const formatDateTime = (dateString: Date) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    month: 'long',
    year: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // use 12-hour clock (true) or 24-hour clock (false)
  }
  const dateOptions: Intl.DateTimeFormatOptions = {
    // weekday: 'short', // abbreviated weekday name (e.g., 'Mon')
    month: 'short', // abbreviated month name (e.g., 'Oct')
    year: 'numeric', // numeric year (e.g., '2023')
    day: 'numeric', // numeric day of the month (e.g., '25')
  }
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric', // numeric hour (e.g., '8')
    minute: 'numeric', // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  }
  const formattedDateTime: string = new Date(dateString).toLocaleString(
    'ro-RO',
    dateTimeOptions
  )
  const formattedDate: string = new Date(dateString).toLocaleString(
    'ro-RO',
    dateOptions
  )
  const formattedTime: string = new Date(dateString).toLocaleString(
    'ro-RO',
    timeOptions
  )
  return {
    dateTime: formattedDateTime,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  }
}
export function formatId(id: string) {
  return `..${id.substring(id.length - 6)}`
}
export const getFilterUrl = ({
  params,
  category,
  tag,
  sort,
  price,
  rating,
  page,
}: {
  params: {
    q?: string
    category?: string
    tag?: string
    price?: string
    rating?: string
    sort?: string
    page?: string
  }
  category?: string
  tag?: string
  sort?: string
  price?: string
  rating?: string
  page?: string
}) => {
  // Pornim de la parametrii curenți (q, category, tag, price, rating, sort, page) din URL
  const newParams: { [key: string]: string } = { ...params } as {
    [key: string]: string
  }

  // Detectăm dacă se schimbă vreun filtru
  let isFiltering = false

  if (category) {
    newParams.category = category
    isFiltering = true
  }
  if (tag) {
    newParams.tag = toSlug(tag)
    isFiltering = true
  }
  if (price) {
    newParams.price = price
    isFiltering = true
  }
  if (rating) {
    newParams.rating = rating
    isFiltering = true
  }
  if (sort) {
    newParams.sort = sort
    isFiltering = true
  }

  // Dacă a fost vreun filtru schimbat, forțăm pagina la 1
  if (isFiltering) {
    newParams.page = '1'
  }

  // Dacă se pasează explicit parametrul `page` (buton Next/Prev), îl aplicăm acum:
  if (page) {
    newParams.page = page
  }

  // Reconstruim query-string-ul
  return `/search?${new URLSearchParams(newParams).toString()}`
}
export const normalizeStringForComparison = (str: string): string => {
  if (!str) return ''
  return str
    .toLowerCase() // 1. Litere mici
    .normalize('NFD') // 2. Descompune diacriticele (ex: 'ă' -> 'a' + '˘')
    .replace(/[\u0300-\u036f]/g, '') // 3. Elimină semnele diacritice
    .replace(/\s+/g, '') // 4. Elimină toate spațiile
}
