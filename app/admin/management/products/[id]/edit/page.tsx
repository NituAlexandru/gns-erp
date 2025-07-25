import Link from 'next/link'
import { getProductById } from '@/lib/db/modules/product/product.actions'
import ProductForm from '../../create/product-form'

const EditProductPage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  const product = await getProductById(id)

  if (!product) {
    return <div>Produsul nu a fost găsit.</div>
  }

  return (
    <main className='max-w-6xl mx-auto p-4 '>
      <div className='flex mb-4'>
        <Link href='/admin/management/products'>Produse</Link>
        <span className='mx-1'>›</span>
        <span className='mx-1'>{product.name}</span>
        <span className='mx-1'>›</span>
        <Link href={`/admin/management/products/${id}/edit`}>Editează</Link>
      </div>
      <ProductForm type='Update' product={product} productId={id} />
    </main>
  )
}

export default EditProductPage
