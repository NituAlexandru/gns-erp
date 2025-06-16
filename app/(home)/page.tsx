// import BrowsingHistoryList from '@/components/shared/browsing-history-list'
// import { HomeCard } from '@/components/shared/home/home-card'
// import ProductSlider from '@/components/shared/product/product-slider'
// import { Card, CardContent } from '@/components/ui/card'
// import {
//   getAllCategories,
//   getProductsByTag,
//   getProductsForCard,
//   getProductsRandomByTag,
//   getProductsRandomForCard,
// } from '@/lib/actions/product.actions'
// import data from '@/lib/data'
// import { toSlug } from '@/lib/utils'

// // Helper Fisher–Yates pentru a amesteca un array
// function shuffleArray<T>(arr: T[]): T[] {
//   const a = [...arr]
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1))
//     ;[a[i], a[j]] = [a[j], a[i]]
//   }
//   return a
// }

// export default async function Page() {
//   // Inițializăm promisiunile fără await imediat
//   const allCategoriesPromise = getAllCategories()
//   const newArrivalsPromise = getProductsForCard({
//     tag: 'new-arrival',
//     limit: 4,
//   })
//   const featuredsPromise = getProductsRandomForCard({
//     tag: 'featured',
//     limit: 4,
//   })
//   const bestSellersPromise = getProductsRandomForCard({
//     tag: 'best-seller',
//     limit: 4,
//   })
//   const todaysDealsPromise = getProductsByTag({ tag: 'todays-deal' })
//   const bestSellingProductsPromise = getProductsRandomByTag({
//     tag: 'best-seller',
//   })

//   // Așteptăm toate odată
//   const [
//     allCategories,
//     newArrivals,
//     featuredsRaw,
//     bestSellers,
//     todaysDealsRaw,
//     bestSellingProductsRaw,
//   ] = await Promise.all([
//     allCategoriesPromise,
//     newArrivalsPromise,
//     featuredsPromise,
//     bestSellersPromise,
//     todaysDealsPromise,
//     bestSellingProductsPromise,
//   ])

//   // Shuffle categoriile + limită la 4
//   const categories = shuffleArray(allCategories).slice(0, 4)

//   const featureds = shuffleArray(featuredsRaw)

//   // Todays deals și best selling products rămân shuffle JS
//   const todaysDeals = shuffleArray(todaysDealsRaw)
//   const bestSellingProducts = shuffleArray(bestSellingProductsRaw)

//   const cards = [
//     {
//       title: 'Categorii de explorat',
//       link: {
//         text: 'Vezi mai multe',
//         href: '/search',
//       },
//       items: categories.map((category) => ({
//         name: category,
//         image: `/images/${toSlug(category)}.webp`,
//         href: `/search?category=${category}`,
//       })),
//     },
//     {
//       title: 'Explorează Noutățile',
//       items: newArrivals,
//       link: {
//         text: 'Vezi toate',
//         href: '/search?tag=new-arrival',
//       },
//     },
//     {
//       title: 'Descopera Cele Mai Vândute',
//       items: bestSellers,
//       link: {
//         text: 'Vezi toate',
//         href: '/search?tag=best-seller',
//       },
//     },
//     {
//       title: 'Produse Recomandate',
//       items: featureds,
//       link: {
//         text: 'Cumpără acum',
//         href: '/search?tag=featured',
//       },
//     },
//   ]

//   return (
//     <>
//       <HomeCarousel items={data.carousels} />
//       <div className='md:p-4 md:space-y-4 bg-border'>
//         <HomeCard cards={cards} />
//         <Card className='w-full rounded-none'>
//           <CardContent className='p-4 items-center gap-3'>
//             <ProductSlider title='Oferte' products={todaysDeals} />
//           </CardContent>
//         </Card>

//         <Card className='w-full rounded-none'>
//           <CardContent className='p-4 items-center gap-3'>
//             <ProductSlider
//               title='Cele mai Vândute'
//               products={bestSellingProducts}
//               hideDetails
//             />
//           </CardContent>
//         </Card>
//       </div>
//       <div className='p-4 bg-background'>
//         <BrowsingHistoryList />
//       </div>
//     </>
//   )
// }

export default async function Page() {
  return (
    <div>
      <h1 className='h1-bold text-center p-10'> Home</h1>
    </div>
  )
}
