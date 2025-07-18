export const PRODUCT_PAGE_SIZE = Number(process.env.PRODUCT_PAGE_SIZE || 12)
export const ADMIN_PRODUCT_PAGE_SIZE = Number(
  process.env.ADMIN_PRODUCT_PAGE_SIZE || 12
)
export const FIELD_LABELS_RO: Record<string, string> = {
  length: 'Lungime (cm)',
  width: 'Lățime (cm)',
  height: 'Înălțime (cm)',
}
export const FIELD_PLACEHOLDERS_RO: Record<
  'length' | 'width' | 'height',
  string
> = {
  length: 'Lungimea în cm',
  width: 'Lățimea în cm',
  height: 'Înălțimea în cm',
}
