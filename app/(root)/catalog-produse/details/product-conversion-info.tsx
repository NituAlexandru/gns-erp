import { Badge } from '@/components/ui/badge'
import { AvailableUnit } from '@/lib/db/modules/product/types'
import { Layers, Package } from 'lucide-react'

export default function ProductConversionInfo({
  units,
}: {
  units: AvailableUnit[]
}) {
  // Dacă avem doar unitatea de bază, nu afișăm nimic
  if (units.length <= 1) return null

  // Găsim unitățile specifice
  const packaging = units.find((u) => u.type === 'PACKAGING')
  const pallet = units.find((u) => u.type === 'PALLET')

  return (
    <div className='flex flex-wrap gap-2 items-center m-0 bg-muted/30 p-0 rounded-lg border border-dashed px-2'>
      <span className='text-sm font-semibold text-muted-foreground mr-2'>
        Mod ambalare:
      </span>

      {/* Ambalaj Intermediar (ex: Sac) */}
      {packaging && (
        <Badge
          variant='outline'
          className='flex items-center gap-1.5 px-3 py-1 text-sm'
        >
          <Package className='h-6 w-6 text-primary' />
          <span>
            1 {packaging.name} = <strong>{packaging.factor}</strong>{' '}
            {units.find((u) => u.type === 'BASE')?.name}
          </span>
        </Badge>
      )}

      {/* Palet */}
      {pallet && (
        <Badge
          variant='outline'
          className='flex items-center gap-1.5 px-3 py-1 text-sm'
        >
          <Layers className='h-6 w-6 text-primary' />
          <span>
            {pallet.displayDetails ? (
              <>
                1 Palet = <strong>{pallet.displayDetails}</strong>
              </>
            ) : (
              <>
                1 Palet = <strong>{pallet.factor}</strong>{' '}
                {units.find((u) => u.type === 'BASE')?.name}
              </>
            )}
          </span>
        </Badge>
      )}
    </div>
  )
}
