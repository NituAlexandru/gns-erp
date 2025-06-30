import Link from 'next/link'
import Pagination from '@/components/shared/pagination'
import ProductCard from '@/components/shared/product/product-card'
import { Button } from '@/components/ui/button'
import type { IProductDoc } from '@/lib/db/modules/product'
import { getFilterUrl, toSlug } from '@/lib/utils'
import {
  getAllCategories,
  getAllProducts,
  getAllTags,
} from '@/lib/db/modules/product'
import CollapsibleOnMobile from '@/components/shared/header/collapsible-on-mobile'
import Search from '@/components/shared/header/search'

const prices = [
  {
    name: '0 - 20 RON',
    value: '0-20',
  },
  {
    name: '21 - 200 RON',
    value: '21-200',
  },
  {
    name: '201 - 500 RON',
    value: '201-500',
  },
  {
    name: '501 - 1.000 RON',
    value: '501-1000',
  },
  {
    name: '1.001 - 2.000 RON',
    value: '1001-2000',
  },
]
const tagLabels: Record<string, string> = {
  all: 'Toate',
  'Best Seller': 'Cele mai vândute',
  Featured: 'Recomandate',
  'New Arrival': 'Noutăți',
  'Todays Deal': 'Oferte',
}

const tagLabelsBreadcrumb: Record<string, string> = {
  all: 'Toate',
  'best-seller': 'Cele mai vândute',
  featured: 'Recomandate',
  'new-arrival': 'Noutăți',
  'todays-deal': 'Oferte',
}

export default async function CatalogPage(props: {
  searchParams: Promise<{
    q: string
    category: string
    tag: string
    price: string
    page: string
  }>
}) {
  const searchParams = await props.searchParams

  const {
    q = 'all',
    category = 'all',
    tag = 'all',
    price = 'all',
    page = '1',
  } = searchParams

  // console.log('[SearchPage] Se randează cu parametrul page:', page)

  const params = { q, category, tag, price, page }

  const categories = await getAllCategories()
  const tags = await getAllTags()
  const data = await getAllProducts({
    category,
    tag,
    query: q,
    price,
    page: Number(page),
  })
  return (
    <div>
      {' '}
      {/* ====== START BreadCrumbs cu butoane de reset pentru fiecare filtru ====== */}
      <div className='mb-2 py-2 md:border-b flex-between flex-col md:flex-row'>
        <div className='flex flex-wrap items-center'>
          {/* 1) Afișăm „Niciun rezultat” sau „X-Y din Z rezultate” */}
          {data.totalProducts === 0 ? (
            <span>Niciun rezultat</span>
          ) : (
            <span>
              {data.from}-{data.to} din {data.totalProducts} rezultate
            </span>
          )}

          {/* 2) Dacă există vreun filtru activ, afișăm cuvântul „pentru” */}
          {(q !== 'all' && q !== '') ||
          (category !== 'all' && category !== '') ||
          (tag !== 'all' && tag !== '') ||
          price !== 'all' ? (
            <span className='ml-2'>pentru:</span>
          ) : null}

          {/* 3) Filtru „Căutare” → la click resetăm q la 'all' */}
          {q !== 'all' && q.trim() !== '' && (
            <Link
              href={getFilterUrl({ params: { ...params, q: 'all' } })}
              className='
         inline-flex items-center 
        bg-red-600 text-white 
        pl-3 rounded-md 
        text-sm font-medium 
         mx-1 my-1
        hover:bg-red-500
      '
            >
              {`Căutare: "${q}"`}{' '}
              <span className='bg-white hover:bg-slate-100 border border-red-600 rounded-e-md text-red-600  ml-1 px-3 py-1 font-bold'>
                x
              </span>
            </Link>
          )}

          {/* 4) Filtru „Categorie” → la click resetăm category la 'all' */}
          {category !== 'all' && category !== '' && (
            <Link
              href={getFilterUrl({ params: { ...params, category: 'all' } })}
              className='
         inline-flex items-center 
        bg-red-600 text-white 
        pl-3 rounded-md 
        text-sm font-medium 
         mx-1 my-1
        hover:bg-red-500
      '
            >
              {`Categorie: ${category}`}{' '}
              <span className='bg-white hover:bg-slate-100 border border-red-600 rounded-e-md text-red-600  ml-1 px-3 py-1 font-bold'>
                x
              </span>
            </Link>
          )}

          {/* 5) Filtru „Etichetă” → la click resetăm tag la 'all' */}
          {tag !== 'all' && tag !== '' && (
            <Link
              href={getFilterUrl({ params: { ...params, tag: 'all' } })}
              className='
        inline-flex items-center 
        bg-red-600 text-white 
        pl-3 rounded-md 
        text-sm font-medium 
         mx-1 my-1
        hover:bg-red-500
      '
            >
              {`Etichetă: ${tagLabelsBreadcrumb[tag] ?? tag}`}
              <span className='bg-white hover:bg-slate-100 border border-red-600 rounded-e-md text-red-600  ml-1 px-3 py-1 font-bold'>
                x
              </span>
            </Link>
          )}

          {/* 6) Filtru „Preț” → la click resetăm price la 'all' */}
          {price !== 'all' && price !== '' && (
            <Link
              href={getFilterUrl({ params: { ...params, price: 'all' } })}
              className='
       inline-flex items-center 
        bg-red-600 text-white 
        pl-3 rounded-md 
        text-sm font-medium 
         mx-1 my-1
        hover:bg-red-500
      '
            >
              {`Preț: ${
                prices.find((p) => p.value === price)?.name ?? price + ' RON'
              }`}{' '}
              <span className='bg-white hover:bg-slate-100 border border-red-600 rounded-e-md text-red-600  ml-1 px-3 py-1 font-bold'>
                x
              </span>
            </Link>
          )}

          {/* 8) Buton “Șterge filtre” (doar dacă există cel puțin un filtru activ) */}
          {(q !== 'all' ||
            category !== 'all' ||
            tag !== 'all' ||
            price !== 'all') && (
            <Button variant='link' asChild className='ml-1'>
              <Link href='/catalog-produse'>Șterge toate filtre</Link>
            </Button>
          )}
        </div>
      </div>
      {/* ====== END BreadCrumbs cu butoane de reset pentru fiecare filtru ====== */}
      <div className=' grid md:grid-cols-5 md:gap-4'>
        <CollapsibleOnMobile title='Filtre'>
          <div className='hidden md:block flex-1 max-w-xl'>
            <Search />
          </div>
          <div className='space-y-4'>
            <div>
              <div className='font-bold'>Categorie</div>
              <ul>
                <li>
                  <Link
                    className={`${
                      ('all' === category || '' === category) && 'text-primary'
                    }`}
                    href={getFilterUrl({ category: 'all', params })}
                  >
                    Toate
                  </Link>
                </li>
                {categories.map((c: string) => (
                  <li key={c}>
                    <Link
                      className={`${c === category && 'text-primary'}`}
                      href={getFilterUrl({ category: c, params })}
                    >
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className='font-bold'>Preț</div>
              <ul>
                <li>
                  <Link
                    className={`${'all' === price && 'text-primary'}`}
                    href={getFilterUrl({ price: 'all', params })}
                  >
                    Toate
                  </Link>
                </li>
                {prices.map((p) => (
                  <li key={p.value}>
                    <Link
                      href={getFilterUrl({ price: p.value, params })}
                      className={`${p.value === price && 'text-primary'}`}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className='font-bold'>Etichetă</div>
              <ul>
                {/* “Toate” */}
                <li>
                  <Link
                    className={tag === 'all' ? 'text-primary' : ''}
                    href={getFilterUrl({ tag: 'all', params })}
                  >
                    {tagLabels['all']}
                  </Link>
                </li>

                {/* Real tags */}
                {tags.map((t) => (
                  <li key={t}>
                    <Link
                      className={toSlug(t) === tag ? 'text-primary' : ''}
                      href={getFilterUrl({ tag: t, params })}
                    >
                      {
                        tagLabels[t] ??
                          t /* fallback to t if you forgot to add it */
                      }
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleOnMobile>

        <div className='md:col-span-4 space-y-4'>
          <div>
            <div className='font-bold text-xl'>Rezultate</div>
            <div>
              Verifică fiecare pagină de produs pentru alte opțiuni de cumpărare
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {data.products.length === 0 && <div>Niciun produs găsit</div>}
            {data.products.map((product: IProductDoc) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          {data!.totalPages! > 1 && (
            <Pagination page={page} totalPages={data.totalPages} />
          )}
        </div>
      </div>
    </div>
  )
}
