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
