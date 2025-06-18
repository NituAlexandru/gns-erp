import { connectToDatabase } from '@/lib/db'
import Product, { IProduct } from '@/lib/db/models/product.model'
import { PAGE_SIZE } from '../constants'

// GET
export async function getAllCategories() {
  await connectToDatabase()
  const categories = await Product.find({ isPublished: true }).distinct(
    'category'
  )
  return categories
}

export async function getProductsByTag({
  tag,
  limit = 10,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await Product.find({
    tags: { $in: [tag] },
    isPublished: true,
  })
    .sort({ createdAt: 'desc' })
    .limit(limit)
  return JSON.parse(JSON.stringify(products)) as IProduct[]
}

export async function getProductBySlug(slug: string) {
  await connectToDatabase()
  const product = await Product.findOne({ slug, isPublished: true })
  if (!product) throw new Error('Product not found')
  return JSON.parse(JSON.stringify(product)) as IProduct
}
export async function getRelatedProductsByCategory({
  category,
  productId,
  limit = PAGE_SIZE,
  page = 1,
}: {
  category: string
  productId: string
  limit?: number
  page: number
}) {
  await connectToDatabase()
  const skipAmount = (Number(page) - 1) * limit
  const conditions = {
    isPublished: true,
    category,
    _id: { $ne: productId },
  }
  const products = await Product.find(conditions)
    .sort({ numSales: 'desc' })
    .skip(skipAmount)
    .limit(limit)
  const productsCount = await Product.countDocuments(conditions)
  return {
    data: JSON.parse(JSON.stringify(products)) as IProduct[],
    totalPages: Math.ceil(productsCount / limit),
  }
}
export async function getProductsDetailsForCart(
  productIds: string[]
): Promise<Record<string, IProduct>> {
  // Returnează un map/record pentru căutare ușoară după ID
  console.log(
    '[Server Action] getProductsDetailsForCart called for IDs:',
    productIds
  )

  // Verificăm dacă avem ID-uri de căutat
  if (!productIds || productIds.length === 0) {
    console.log(
      '[Server Action] No product IDs provided to getProductsDetailsForCart.'
    )
    return {} // Returnăm un obiect gol dacă lista de ID-uri e goală
  }

  try {
    await connectToDatabase()

    // Căutăm toate produsele ale căror ID-uri sunt în array-ul primit
    // Folosim .lean() pentru performanță (returnează obiecte JS simple, nu documente Mongoose complexe)
    const products = await Product.find({
      _id: { $in: productIds }, // Operatorul $in pentru a căuta mai multe ID-uri
    }).lean<IProduct[]>() // Specificăm tipul așteptat după .lean()

    // Transformăm array-ul de produse într-un obiect (Record)
    // pentru acces rapid folosind ID-ul produsului ca cheie
    const productsMap: Record<string, IProduct> = {}
    products.forEach((product) => {
      // Verificăm dacă produsul și ID-ul există (bună practică)
      if (product?._id) {
        // Convertim ObjectId în string pentru cheia obiectului
        const plainProduct = JSON.parse(JSON.stringify(product))
        productsMap[product._id.toString()] = plainProduct
      }
    })

    console.log(
      `[Server Action] Found details for ${
        Object.keys(productsMap).length
      } out of ${productIds.length} requested products.`
    )
    return productsMap
  } catch (error) {
    console.error('Error fetching product details for cart:', error)
    // Putem arunca eroarea mai departe sau returna un obiect gol
    // Alegem să returnăm gol pentru a nu bloca complet procesul în caz de eroare la fetch
    return {}
  }
}
