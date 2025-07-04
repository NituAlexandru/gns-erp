import SupplierView from './supplier-view'

export default function SupplierPage({
  params,
}: {

  params: Promise<{ id: string; slug: string }>
}) {

  return <SupplierView params={params} />
}

