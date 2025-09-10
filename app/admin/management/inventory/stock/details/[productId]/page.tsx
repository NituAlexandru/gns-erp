import { getProductStockDetails } from '@/lib/db/modules/inventory/inventory.actions'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { UnitDisplay } from '@/components/inventory/unit-display' // 👈 Importăm noua componentă de afișare
import { BatchListTable } from '@/components/inventory/batch-list-table' // 👈 Importăm noul tabel interactiv

export default async function ProductStockDetailsPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const productDetails = await getProductStockDetails(productId)

  if (!productDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-destructive'>
            Produsul nu a fost găsit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Nu am putut găsi detalii pentru produsul cu ID-ul specificat.</p>
        </CardContent>
      </Card>
    )
  }

  const totalStockAcrossLocations = productDetails.locations.reduce(
    (acc, loc) =>
      acc + loc.batches.reduce((sum, batch) => sum + batch.quantity, 0),
    0
  )

  const baseUnit = productDetails.unit || productDetails.packagingUnit || 'buc'

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{productDetails.name}</CardTitle>
          <CardDescription>
            Cod: {productDetails.productCode || '-'} | Stoc Total:{' '}
            <UnitDisplay
              baseQuantity={totalStockAcrossLocations}
              baseUnit={baseUnit}
              options={productDetails.packagingOptions}
              className='text-destructive'
            />
          </CardDescription>
        </CardHeader>
      </Card>

      <BatchListTable
        baseUnit={baseUnit}
        locations={productDetails.locations}
        packagingOptions={productDetails.packagingOptions}
      />
    </div>
  )
}
