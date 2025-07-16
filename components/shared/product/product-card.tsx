import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import ImageHover from './image-hover'
import { IProductDoc } from '@/lib/db/modules/product/types'

const ProductCard = ({
  product,
  hideBorder = false,
  hideDetails = false,
}: {
  product: IProductDoc
  hideDetails?: boolean
  hideBorder?: boolean
  hideAddToCart?: boolean
}) => {
  const ProductImage = () => (
    <Link href={`/product/${product.slug}`}>
      <div className='relative h-52'>
        {product.images.length > 1 ? (
          <ImageHover
            src={product.images[0]}
            hoverSrc={product.images[1]}
            alt={product.name}
          />
        ) : (
          <div className='relative h-52'>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes='80vw'
              className='object-contain'
            />
          </div>
        )}
        {product.countInStock === 0 && (
          <div className='absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded'>
            Stoc epuizat
          </div>
        )}
      </div>
    </Link>
  )
  const ProductDetails = () => (
    <div className='flex-1 space-y-2'>
      <p className='font-bold'>{product.brand}</p>
      <Link
        href={`/product/${product.slug}`}
        className='overflow-hidden text-ellipsis'
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {product.name}
      </Link>

      {/* only show per-unit price if packagingQuantity > 1 */}
      {product.packagingQuantity && product.packagingQuantity > 1 && (
        <div className='flex flex-direction-row justify-center gap-1'>
          <p className='text-sm text-white-600'>
            {formatCurrency(product.price / product.packagingQuantity)} /{' '}
            {product.unit}
          </p>
          <span className='text-sm text-muted-foreground'>TVA inclus</span>
        </div>
      )}
    </div>
  )

  return hideBorder ? (
    <div className='flex flex-col'>
      <ProductImage />
      {!hideDetails && (
        <div className='p-3 flex-1 text-center'>
          <ProductDetails />
        </div>
      )}
    </div>
  ) : (
    <Card className='flex flex-col  '>
      <CardHeader className='p-3'>
        <ProductImage />
      </CardHeader>
      {!hideDetails && (
        <CardContent className='p-3 flex-1  text-center'>
          <ProductDetails />
        </CardContent>
      )}
    </Card>
  )
}

export default ProductCard
