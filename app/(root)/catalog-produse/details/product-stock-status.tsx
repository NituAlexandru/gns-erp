import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EnrichedStockLocation,
  AvailableUnit,
} from '@/lib/db/modules/product/types'
import { Badge } from '@/components/ui/badge'

interface ProductStockStatusProps {
  stockData: EnrichedStockLocation[]
  unit: string // Unitatea de bază (pentru fallback)
  units: AvailableUnit[] // Lista cu factori de conversie
  compact?: boolean
}

export default function ProductStockStatus({
  stockData,
  unit,
  units,
  compact = false,
}: ProductStockStatusProps) {
  // 1. Calculăm totalurile în unitatea de bază (ex: KG)
  const totalStockBase = stockData.reduce((acc, loc) => acc + loc.totalStock, 0)
  const totalReservedBase = stockData.reduce(
    (acc, loc) => acc + loc.reserved,
    0,
  )
  const totalAvailableBase = stockData.reduce(
    (acc, loc) => acc + loc.available,
    0,
  )

  // 2. Pregătim unitățile pentru afișare (sortate: bucată -> sac -> palet)
  // Dacă nu avem unități definite, folosim unitatea de bază ca singura opțiune
  const displayUnits =
    units && units.length > 0
      ? [...units].sort((a, b) => a.factor - b.factor)
      : [{ name: unit, factor: 1, type: 'BASE' }]

  // 3. Funcția de formatare
  // ATENȚIE: Aici folosim ÎMPĂRȚIREA pentru că transformăm Cantitate Totală -> Unități de Ambalare
  // Ex: 1000 KG / 25 (factor sac) = 40 Saci
  const formatStock = (baseValue: number, showZero = false) => {
    if (baseValue === 0 && !showZero) return '-'

    return displayUnits
      .map((u) => {
        // Dacă e unitate de bază sau factorul e 0, evităm împărțirea la 0
        const factor = u.factor || 1
        const val = baseValue / factor

        // Afișăm cu max 2 zecimale, eliminând .00
        return `${Number(val.toFixed(2))} ${u.name}`
      })
      .join(' / ')
  }

  return (
    <div className='space-y-0 m-0'>
      <div className='flex items-center justify-between'>
        <h3
          className={`font-semibold mb-2 md:mb-0 ${compact ? 'text-sm' : 'text-lg'}`}
        >
          Stoc Disponibil (Inventar)
        </h3>

        {stockData.length > 0 && (
          <div
            className={`flex ${
              compact ? 'flex-col items-end gap-0.5' : 'flex-wrap gap-2'
            } text-muted-foreground ${compact ? 'text-[10px]' : 'text-sm'}`}
          >
            <span className='whitespace-nowrap'>
              Total:{' '}
              <span className='font-medium text-foreground'>
                {formatStock(totalStockBase, true)}
              </span>
            </span>

            <span className={`mx-1 ${compact ? 'hidden' : 'hidden md:inline'}`}>
              &bull;
            </span>

            <span className='whitespace-nowrap'>
              Rezervat:{' '}
              <span className='font-medium text-orange-600'>
                {formatStock(totalReservedBase, true)}
              </span>
            </span>

            <span className={`mx-1 ${compact ? 'hidden' : 'hidden md:inline'}`}>
              &bull;
            </span>

            <span className='whitespace-nowrap'>
              Disponibil:{' '}
              <span className='font-medium text-green-600'>
                {formatStock(totalAvailableBase, true)}
              </span>
            </span>
          </div>
        )}
        <Badge variant={stockData.length > 0 ? 'outline' : 'secondary'}>
          {stockData.length} Locații
        </Badge>
      </div>

      {stockData.length > 0 ? (
        <div className='border rounded-md overflow-hidden mt-2'>
          <Table className={compact ? 'text-xs' : ''}>
            <TableHeader className='bg-muted/50'>
              <TableRow className={compact ? 'h-8' : ''}>
                <TableHead className={`w-[150px] ${compact ? 'h-8 py-1' : ''}`}>
                  Locație
                </TableHead>
                <TableHead
                  className={`text-right w-[28%] ${compact ? 'h-8 py-1' : ''}`}
                >
                  Total
                </TableHead>
                <TableHead
                  className={`text-right w-[28%] ${compact ? 'h-8 py-1' : ''}`}
                >
                  Rezervat
                </TableHead>
                <TableHead
                  className={`text-right w-auto ${compact ? 'h-8 py-1' : ''}`}
                >
                  Disponibil
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.map((loc) => (
                <TableRow key={loc.location} className={compact ? 'h-8' : ''}>
                  {/* Celule mai scunde cu padding mic */}
                  <TableCell className={`font-medium ${compact ? 'py-1' : ''}`}>
                    {loc.locationName}
                  </TableCell>

                  <TableCell
                    className={`text-right whitespace-nowrap ${compact ? 'py-1' : ''}`}
                  >
                    {formatStock(loc.totalStock, true)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-orange-600 font-medium whitespace-nowrap ${compact ? 'py-1' : ''}`}
                  >
                    {formatStock(loc.reserved)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold text-green-600 whitespace-nowrap ${compact ? 'py-1' : ''}`}
                  >
                    {formatStock(loc.available, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className='p-6 border border-dashed rounded-md bg-muted/10 text-center text-muted-foreground mt-2'>
          Nu există stoc fizic înregistrat.
        </div>
      )}
    </div>
  )
}
