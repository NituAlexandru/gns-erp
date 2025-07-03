import SupplierView from './supplier-view'

// Pagina primește `params` ca o promisiune
export default function SupplierPage({
  params,
}: {
  // ✨ Tipul este acum Promise<{...}> ✨
  params: Promise<{ id: string; slug: string }>
}) {
  // Pasăm promisiunea mai departe componentei async
  return <SupplierView params={params} />
}

