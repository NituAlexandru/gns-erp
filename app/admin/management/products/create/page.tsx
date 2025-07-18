import Link from 'next/link'
import ProductForm from './product-form'

const CreateProductPage = () => {
  return (
    <main className='max-w-6xl mx-auto p-4 '>
      <div className='flex mb-4'>
        <Link href='/admin/management/products'>Produse</Link>
        <span className='mx-1'>›</span>
        <Link href='/admin/management/products/create'>Creaza</Link>
      </div>
      <ProductForm type='Create' />
    </main>
  )
}

export default CreateProductPage
