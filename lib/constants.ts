import { PalletType } from '@/types'
import { VehicleType } from './db/modules/vehicle/types'

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Genesis ERP'
export const APP_SLOGAN =
  process.env.NEXT_PUBLIC_APP_SLOGAN || 'Solutie customizabila pentru Genesis'
export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  'Genesis ERP va ofera o solutie practica pentru gestionarea tuturor aspectelor legate de business-ul dumneavoastra.'

export const UNITS = [
  'sac',
  'bucata',
  'rola',
  'set',
  'cutie',
  'punga',
  'colac',
  'palet',
  'bax',
  'litru',
  'kg',
  'm3',
  'm2',
  'ml',
] as const
// Resend
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@genesis-md.ro'
export const SENDER_NAME = process.env.SENDER_NAME || APP_NAME
export const OFFER_REQUEST_RECIPIENT = process.env.OFFER_REQUEST_RECIPIENT!
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || 'genesismarketingdistributie@gmail.com'

export const SITE_URL = 'http://localhost:3000/'

export const FREE_SHIPPING_MIN_PRICE = Number(
  process.env.FREE_SHIPPING_MIN_PRICE || 10000
)

export const ALLOWED_COUNTIES: string[] = [
  'ilfov',
  'bucuresti',
  'sector 1',
  'sector 2',
  'sector 3',
  'sector 4',
  'sector 5',
  'sector 6',
  'ialomita',
  'calarasi',
  'giurgiu',
  'teleorman',
  'dambovita',
  'prahova',
  'buzau',
]
export const NO_PALLET = 'NO_PALLET_SELECTED'

export const AVAILABLE_PALLET_TYPES: PalletType[] = [
  {
    id: '681d9bd24ef1b57a5f17ad4a',
    name: 'Palet Soceram',
    slug: 'palet-soceram',
    custodyFee: 65,
    lengthCm: 150,
    widthCm: 120,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.27,
    image: '/images/palet.webp',
    supplier: 'Soceram',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 60,00 RON, in stare buna.',
  },
  {
    id: '681d9bd24ef1b57a5f17ad4b',
    name: 'Palet Wienerberger',
    slug: 'palet-wienerberger',
    custodyFee: 85,
    lengthCm: 118,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.177,
    image: '/images/palet.webp',
    supplier: 'Wienerberger',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 74,00 RON, in stare buna.',
  },
  {
    id: '681d9ef34ef1b57a5f17ad77',
    name: 'Palet Euroterm',
    slug: 'palet-euroterm',
    custodyFee: 42,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Euroterm',
    returnConditions:
      'Returnabil in 60 zile la valoarea de 35,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183189',
    name: 'Palet Cemacon',
    slug: 'palet-cemacon',
    custodyFee: 95,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Cemacon',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 82,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18318a',
    name: 'Palet Europalet',
    slug: 'palet-europalet',
    custodyFee: 90,
    lengthCm: 120,
    widthCm: 80,
    heightCm: 15,
    weightKg: 24,
    volumeM3: 0.135,
    image: '/images/palet.webp',
    supplier: 'Europalet',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 85,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18318b',
    name: 'Palet Semmerlock',
    slug: 'palet-semmerlock',
    custodyFee: 95,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Semmerlock',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 84,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18318c',
    name: 'Palet Brikston',
    slug: 'palet-brikston',
    custodyFee: 90,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Brikston',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 88,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18318d',
    name: 'Palet Cesal',
    slug: 'palet-cesal',
    custodyFee: 78,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Cesal',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 74,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18318e',
    name: 'Palet Holcim',
    slug: 'palet-holcim',
    custodyFee: 95,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Holcim',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 90,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18318f',
    name: 'Palet Macofil',
    slug: 'palet-macofil',
    custodyFee: 55,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Macofil',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 50,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183190',
    name: 'Palet Bca',
    slug: 'palet-bca',
    custodyFee: 80,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Bca',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 75,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183191',
    name: 'Palet Prefab',
    slug: 'palet-prefab',
    custodyFee: 55,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Prefab',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 45,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183192',
    name: 'Palet Enduria',
    slug: 'palet-enduria',
    custodyFee: 80,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Enduria',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 75,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183193',
    name: 'Palet Palet',
    slug: 'palet-palet',
    custodyFee: 95,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Palet',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 83,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183194',
    name: 'Palet Europalet-ab',
    slug: 'palet-europalet-ab',
    custodyFee: 20,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Europalet-ab',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 16,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183195',
    name: 'Palet Thermosistem',
    slug: 'palet-thermosistem',
    custodyFee: 95,
    lengthCm: 120,
    widthCm: 80,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.144,
    image: '/images/palet.webp',
    supplier: 'Thermosistem',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 90,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183196',
    name: 'Palet Adeziv 60',
    slug: 'palet-adeziv-60',
    custodyFee: 72,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Adeziv 60',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 65,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183197',
    name: 'Palet Adeziv 120',
    slug: 'palet-adeziv-120',
    custodyFee: 145,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Adeziv 120',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 135,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183198',
    name: 'Palet Elpreco BCA',
    slug: 'palet-elpreco-bca',
    custodyFee: 78,
    lengthCm: 131,
    widthCm: 81,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.16,
    image: '/images/palet.webp',
    supplier: 'Elpreco BCA',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 74,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f183199',
    name: 'Palet Elpreco Pavaj',
    slug: 'palet-elpreco-pavaj',
    custodyFee: 102,
    lengthCm: 131,
    widthCm: 81,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.16,
    image: '/images/palet.webp',
    supplier: 'Elpreco Pavaj',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 95,00 RON, in stare buna.',
  },
  {
    id: '6822e8884ef1b57a5f18319a',
    name: 'Palet Romcim',
    slug: 'palet-romcim',
    custodyFee: 95,
    lengthCm: 120,
    widthCm: 100,
    heightCm: 15,
    weightKg: 25,
    volumeM3: 0.18,
    image: '/images/palet.webp',
    supplier: 'Romcim',
    returnConditions:
      'Returnabil in maxim 60 zile la valoarea de 84,00 RON, in stare buna.',
  },
]
export const VAT_RATE = 0.19
export const VEHICLE_TYPES: VehicleType[] = [
  {
    name: 'Curier',
    maxLoadKg: 30,
    maxVolumeM3: 0.09,
    lengthCm: 60,
    widthCm: 50,
    heightCm: 30,
    ratePerKm: 1,
  },
  {
    name: 'Autoturism',
    maxLoadKg: 850,
    maxVolumeM3: 2.25,
    lengthCm: 150,
    widthCm: 120,
    heightCm: 125,
    ratePerKm: 1.0,
  },
  {
    name: 'Autoutilitara cu Prelata',
    maxLoadKg: 1500,
    maxVolumeM3: 13.0,
    lengthCm: 380,
    widthCm: 205,
    heightCm: 180,
    ratePerKm: 2.0,
  },
  {
    name: 'Camion cu Macara 7t',
    maxLoadKg: 3200,
    maxVolumeM3: 18.0,
    lengthCm: 400,
    widthCm: 210,
    heightCm: 220,
    ratePerKm: 2.0,
  },
  {
    name: 'Camion cu Macara 13t',
    maxLoadKg: 6400,
    maxVolumeM3: 28.0,
    lengthCm: 550,
    widthCm: 240,
    heightCm: 220,
    ratePerKm: 2.5,
  },
  {
    name: 'Camion cu Macara 22t',
    maxLoadKg: 11000,
    maxVolumeM3: 28.0,
    lengthCm: 620,
    widthCm: 240,
    heightCm: 220,
    ratePerKm: 6.0,
  },
  {
    name: 'Camion cu Macara 22t cu Remorca',
    maxLoadKg: 22000,
    maxVolumeM3: 56.0,
    lengthCm: 620,
    widthCm: 240,
    heightCm: 220,
    ratePerKm: 6.0,
  },
  {
    name: 'Tir',
    maxLoadKg: 23000,
    maxVolumeM3: 86.0,
    lengthCm: 1300,
    widthCm: 245,
    heightCm: 270,
    ratePerKm: 5.5,
  },
]
export const DEPOT_ADDRESS =
  'Com. Chiajna, Strada Industriilor 191, Ilfov 077040, Romania'

export const AVAILABLE_DELIVERY_DATES = [
  {
    name: 'Livrare',
    daysToDeliver: 4,
    minDays: 2,
    maxDays: 5,
    shippingPrice: 10.0,
    freeShippingMinPrice: 10000,
    message:
      'Costurile de livrare se calculeaza in functie de locatie si cantitatea comandata',
  },
  {
    name: 'Ridicare Personală Din Depozit Chiajna',
    minDays: 1,
    maxDays: 5,
    daysToDeliver: 3,
    shippingPrice: 0,
    freeShippingMinPrice: 1,
    message: 'Nu implica costuri extra',
  },
]
export const ADMIN_PAGE_SIZE = 15
export const PAGE_SIZE = Number(process.env.PAGE_SIZE || 16)
export const AVAILABLE_TAGS = [
  'best-seller',
  'featured',
  'todays-deal',
  'new-arrival',
] as const
export const USER_ROLES = ['Administrator', 'Admin', 'Manager', 'User', 'Agent-vanzari']
export const THEMES = ['Light', 'Dark', 'System']
