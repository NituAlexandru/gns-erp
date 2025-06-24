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
export async function getAllTags() {
  const tags = await Product.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: null, uniqueTags: { $addToSet: '$tags' } } },
    { $project: { _id: 0, uniqueTags: 1 } },
  ])
  return (
    (tags[0]?.uniqueTags
      .sort((a: string, b: string) => a.localeCompare(b))
      .map((x: string) =>
        x
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      ) as string[]) || []
  )
}
export async function getAllProducts({
  query,
  limit,
  page,
  category,
  tag,
  price,
  rating,
  sort,
}: {
  query: string
  category: string
  tag: string
  limit?: number
  page: number
  price?: string
  rating?: string
  sort?: string
}) {
  // --- Loguri inițiale (pe acestea le-ai avut și sunt corecte) ---
  console.log(
    `[getAllProducts] Primit: page=${page}, query='${query}', category='${category}', tag='${tag}', price='${price}', rating='${rating}', sort='${sort}'`
  )
  console.log(
    `[getAllProducts] Valoarea PAGE_SIZE (din constants): ${PAGE_SIZE}`
  )
  console.log(`[getAllProducts] Parametrul 'limit' primit de funcție: ${limit}`)

  limit = limit || PAGE_SIZE
  console.log(
    `[getAllProducts] Valoarea 'limit' EFECTIVĂ folosită pentru query: ${limit}`
  )

  const skipAmount = limit * (Number(page) - 1)
  console.log(`[getAllProducts] Valoarea 'skipAmount' calculată: ${skipAmount}`)

  await connectToDatabase()

  const queryFilter =
    query && query !== 'all'
      ? {
          name: {
            $regex: query,
            $options: 'i',
          },
        }
      : {}
  const categoryFilter = category && category !== 'all' ? { category } : {}
  const tagFilter = tag && tag !== 'all' ? { tags: tag } : {}

  const ratingFilter =
    rating && rating !== 'all'
      ? {
          avgRating: {
            $gte: Number(rating),
          },
        }
      : {}
  // 10-50
  const priceFilter =
    price && price !== 'all'
      ? {
          price: {
            $gte: Number(price.split('-')[0]),
            $lte: Number(price.split('-')[1]), // 10-50
          },
        }
      : {}
  const order: Record<string, 1 | -1> =
    sort === 'best-selling'
      ? { numSales: -1, _id: -1 }
      : sort === 'price-low-to-high'
        ? { price: 1, _id: -1 }
        : sort === 'price-high-to-low'
          ? { price: -1, _id: -1 }
          : sort === 'avg-customer-review'
            ? { avgRating: -1, _id: -1 }
            : { _id: -1 }
  const isPublished = { isPublished: true }

  console.log(
    '[getAllProducts] Filtrele Efective trimise la Product.find():',
    JSON.stringify(
      {
        // Logăm direct obiectul care va fi pasat
        ...isPublished,
        ...queryFilter,
        ...tagFilter,
        ...categoryFilter,
        ...priceFilter,
        ...ratingFilter,
      },
      null,
      2
    )
  )

  const products = await Product.find({
    ...isPublished,
    ...queryFilter,
    ...tagFilter,
    ...categoryFilter,
    ...priceFilter,
    ...ratingFilter,
  })
    .sort(order)
    .skip(limit * (Number(page) - 1))
    .limit(limit)
    .lean()
  console.log(
    `[getAllProducts] Produse returnate de DB pentru pagina ${page}: ${products.length}`
  )
  console.log(
    `[getAllProducts] ID-uri produse returnate: ${products.map((p) => p._id).join(', ')}`
  )
  const countProducts = await Product.countDocuments({
    ...isPublished,
    ...queryFilter,
    ...tagFilter,
    ...categoryFilter,
    ...priceFilter,
    ...ratingFilter,
  })
  return {
    products: JSON.parse(JSON.stringify(products)) as IProduct[],
    totalPages: Math.ceil(countProducts / limit),
    totalProducts: countProducts,
    from: skipAmount + 1,
    to: skipAmount + products.length,
  }
}
