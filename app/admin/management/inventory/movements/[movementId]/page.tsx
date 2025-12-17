import { getStockMovementDetails } from '@/lib/db/modules/inventory/inventory.actions.read'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  MOVEMENT_TYPE_DETAILS_MAP,
  LOCATION_NAMES_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import { formatCurrency, cn } from '@/lib/utils'
import { BackButton } from './back-button'
import { UnitDisplay } from '@/components/inventory/unit-display'
import StockMovementModel from '@/lib/db/modules/inventory/movement.model'
import Link from 'next/link'
import { ExternalLink, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// 1. Extrage Numărul Documentului (din seriesName + noteNumber sau invoiceNumber)
const getDocumentNumber = (movement: any, reference: any) => {
  if (movement.documentNumber) return movement.documentNumber

  if (movement.movementType === 'RECEPTIE') {
    const receptionNum =
      reference?.receptionNumber ||
      reference?.number ||
      movement.referenceId?.toString().slice(-6) ||
      'N/A'
    const receptionDate = reference?.receptionDate || reference?.date

    let label = `Recepție #${receptionNum}`
    if (receptionDate) {
      label += ` din ${format(new Date(receptionDate), 'dd.MM.yyyy')}`
    }
    return label
  }

  if (movement.movementType === 'STOC_INITIAL') {
    return `Adaugare Stoc Initial #${movement.referenceId.toString()}`
  }
  if (movement.movementType === 'PLUS_INVENTAR') {
    return `Ajustare Inventar (Plus) #${movement.referenceId.toString()}`
  }
  if (
    [
      'TRANSFER_IN',
      'TRANSFER_OUT',
      'BON_DE_CONSUM',
      'PIERDERE',
      'PLUS_INVENTAR',
      'MINUS_INVENTAR',
      'CORECTIE_OPERARE',
      'DETERIORARE',
    ].includes(movement.movementType)
  ) {
    // Afișăm ID-ul tranzacției interne (referenceId) pe post de "Bon Intern"
    return movement.referenceId
      ? `Transfer Intern #${movement.referenceId.toString()}`
      : 'Intern'
  }

  if (!reference) return '-'

  // Logica pentru Avize (GNS-A 00087) și Facturi
  const series = reference.seriesName || reference.series || ''
  const number =
    reference.noteNumber || reference.invoiceNumber || reference.number || ''

  if (series || number) return `${series} ${number}`.trim()
  return reference.orderNumberSnapshot || '-'
}

// 3. Extrage Nume Partener (Furnizor sau Client)
const getPartnerName = (movement: any) => {
  // CAZ SPECIAL: Transferuri (Partenerul este Locația Opusă)
  if (movement.movementType === 'TRANSFER_IN') {
    return movement.locationFrom
      ? LOCATION_NAMES_MAP[
          movement.locationFrom as keyof typeof LOCATION_NAMES_MAP
        ] || movement.locationFrom
      : 'Intern'
  }
  if (movement.movementType === 'TRANSFER_OUT') {
    return movement.locationTo
      ? LOCATION_NAMES_MAP[
          movement.locationTo as keyof typeof LOCATION_NAMES_MAP
        ] || movement.locationTo
      : 'Intern'
  }

  // CAZ SPECIAL: Ajustări Interne (Nu există partener extern)
  if (
    [
      'BON_DE_CONSUM',
      'PIERDERE',
      'PLUS_INVENTAR',
      'MINUS_INVENTAR',
      'CORECTIE_OPERARE',
      'DETERIORARE',
    ].includes(movement.movementType)
  ) {
    return 'Intern (GNS)'
  }

  if (
    IN_TYPES.has(movement.movementType) ||
    movement.movementType === 'STOC_INITIAL' ||
    movement.movementType === 'PLUS_INVENTAR'
  ) {
    // Câmpul populat se numește movement.supplierId (conform modelului tău)
    return movement.supplierId?.name || 'N/A'
  }

  // Pentru ieșiri (Avize), partenerul este clientul
  // Verificăm dacă clientId este populat sau folosim snapshot
  if (movement.clientId?.name) return movement.clientId.name
  if (movement.clientSnapshot?.name) return movement.clientSnapshot.name

  // Fallback la note
  if (movement.note?.includes('de la furnizor')) {
    return movement.note.split('de la furnizor')[1]?.trim() || '-'
  }
  return '-'
}

// 4. Construiește opțiunile pentru produsul principal (header)
const buildMainItemOptions = (stockItem: any) => {
  if (!stockItem) return []
  const options = []
  if (stockItem.packagingUnit && stockItem.packagingQuantity) {
    options.push({
      unitName: stockItem.packagingUnit,
      baseUnitEquivalent: stockItem.packagingQuantity,
    })
  }
  return options
}

// --- PAGINA PRINCIPALĂ ---

export default async function MovementDetailsPage({
  params,
}: {
  params: Promise<{ movementId: string }>
}) {
  const { movementId } = await params
  const data = await getStockMovementDetails(movementId)

  if (!data || !data.movement) {
    return (
      <div className='p-6'>
        <Card className='border-destructive/50'>
          <CardHeader>
            <CardTitle className='text-destructive'>
              Mișcare inexistentă
            </CardTitle>
          </CardHeader>
          <CardContent>ID: {movementId}</CardContent>
        </Card>
      </div>
    )
  }

  const { movement, reference } = data
  const movementTypeDetails = MOVEMENT_TYPE_DETAILS_MAP[movement.movementType]

  // Locație
  const locationKey = movement.locationTo || movement.locationFrom
  const locationName = locationKey ? LOCATION_NAMES_MAP[locationKey] : '-'

  // Partener
  let relatedMovementId = null
  if (
    (movement.movementType === 'TRANSFER_IN' ||
      movement.movementType === 'TRANSFER_OUT') &&
    movement.referenceId
  ) {
    const related = await StockMovementModel.findOne({
      referenceId: movement.referenceId,
      _id: { $ne: movement._id },
    })
      .select('_id')
      .lean()
    if (related) relatedMovementId = related._id.toString()
  }

  let receptionId = null
  if (movement.movementType === 'RECEPTIE') {
    const ref = movement.receptionRef

    if (ref && typeof ref === 'object' && '_id' in ref) {
      receptionId = (ref as { _id: string })._id.toString()
    } else if (ref) {
      receptionId = ref.toString()
    }

    // Fallback la referenceId dacă nu am găsit receptionRef
    if (!receptionId && movement.referenceId) {
      receptionId = movement.referenceId.toString()
    }
  }

  // 2. Calculăm Label-ul corect
  let partnerLabel = 'Partener'
  if (movement.movementType === 'TRANSFER_IN')
    partnerLabel = 'Sursă (Din Gestiunea)'
  else if (movement.movementType === 'TRANSFER_OUT')
    partnerLabel = 'Destinație (Către)'
  else if (
    ['BON_DE_CONSUM', 'PIERDERE', 'MINUS_INVENTAR'].includes(
      movement.movementType
    )
  )
    partnerLabel = 'Responsabil'
  else if (IN_TYPES.has(movement.movementType)) partnerLabel = 'Furnizor'
  else partnerLabel = 'Client'

  const partnerName = getPartnerName(movement)

  // Document & Produs
  const displayDocNumber = getDocumentNumber(movement, reference)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainItemOptions = buildMainItemOptions(movement.stockableItem as any)

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <BackButton />
        <h1 className='text-2xl font-semibold tracking-tight'>
          Detalii Mișcare Stoc
        </h1>
      </div>

      <div className='flex flex-col lg:flex-row gap-2'>
        {/* Coloana Stânga */}
        <div className='lg:w-2/3 flex flex-col gap-2'>
          {/* Card 1: Informații Generale */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle>Informații Generale</CardTitle>
              <CardDescription className='font-mono text-xs'>
                ID: {movement._id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-1'>
                <DetailRow
                  label='Dată și Oră'
                  value={format(
                    new Date(movement.timestamp),
                    'dd MMMM yyyy, HH:mm',
                    { locale: ro }
                  )}
                />
                <DetailRow
                  label='Tip Mișcare'
                  value={
                    <Badge
                      variant={movementTypeDetails?.variant || 'secondary'}
                    >
                      {movementTypeDetails?.name || movement.movementType}
                    </Badge>
                  }
                />
                <DetailRow
                  label='Document Referință'
                  value={
                    relatedMovementId ? (
                      <Link
                        href={`/admin/management/inventory/movements/${relatedMovementId}`}
                        className='font-semibold text-red-500 hover:text-red-700 hover:underline flex items-center justify-end gap-1'
                      >
                        {displayDocNumber}
                        <ExternalLink className='h-4 w-4' />
                      </Link>
                    ) : receptionId ? (
                      // AICI este noul link către recepție
                      <Link
                        href={`/admin/management/reception/${receptionId}`}
                        className='font-semibold text-red-500 hover:text-red-700 hover:underline flex items-center justify-end gap-1'
                      >
                        {displayDocNumber}
                        <ExternalLink className='h-4 w-4' />
                      </Link>
                    ) : (
                      <span className='font-semibold text-primary'>
                        {displayDocNumber}
                      </span>
                    )
                  }
                />

                <DetailRow label={partnerLabel} value={partnerName} />
                <DetailRow
                  label='Produs (Fișă Stoc)'
                  value={
                    movement.stockableItem?._id ? (
                      <Link
                        href={`/admin/management/inventory/stock/details/${movement.stockableItem._id}`}
                        className='flex items-center justify-end gap-1 text-primary hover:text-primary/80 hover:underline transition-colors'
                        title='Mergi la Fișa de Stoc a produsului'
                      >
                        <span className='font-semibold text-right truncate max-w-[300px]'>
                          {movement.stockableItem.name}
                        </span>
                        <ExternalLink className='h-4 w-4 shrink-0' />
                      </Link>
                    ) : (
                      movement.stockableItem?.name || 'N/A'
                    )
                  }
                />
                <DetailRow
                  label='Cantitate'
                  value={
                    <div className='flex justify-end gap-1'>
                      <span
                        className={
                          IN_TYPES.has(movement.movementType)
                            ? 'text-green-600 font-bold'
                            : 'text-red-600 font-bold'
                        }
                      >
                        {IN_TYPES.has(movement.movementType) ? '+' : '-'}
                      </span>
                      <UnitDisplay
                        baseQuantity={movement.quantity}
                        baseUnit={movement.unitMeasure || ''}
                        options={mainItemOptions}
                        className={
                          IN_TYPES.has(movement.movementType)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      />
                    </div>
                  }
                />
                <DetailRow label='Locație' value={locationName} />
                <DetailRow
                  label='Operator'
                  value={movement.responsibleUser?.name || '-'}
                />
                <DetailRow label='Notă Internă' value={movement.note || '-'} />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Trasabilitate (Apare DOAR dacă avem loturi fizice - ex: Produse) */}
          {movement.costBreakdown && movement.costBreakdown.length > 0 && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle>Trasabilitate & Loturi Sursă</CardTitle>
                <CardDescription>
                  Loturile din care s-a consumat/format cantitatea.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Intrare</TableHead>
                      <TableHead>Furnizor</TableHead>
                      <TableHead>Detalii Calitate</TableHead>
                      <TableHead className='text-right'>Cantitate</TableHead>
                      <TableHead className='text-right'>Cost Unitar</TableHead>
                      <TableHead className='text-right'>Valoare Lot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movement.costBreakdown.map((item: any, index: number) => {
                      // 1. Extragem datele de calitate SPECIFICE acestui rând (item)
                      const q =
                        item.qualityDetails ||
                        item.batchSnapshot?.qualityDetails ||
                        {}

                      // 2. Verificăm dacă avem date de afișat
                      const hasQualityDetails =
                        (q.lotNumbers && q.lotNumbers.length > 0) ||
                        (q.certificateNumbers &&
                          q.certificateNumbers.length > 0) ||
                        (q.testReports && q.testReports.length > 0) ||
                        q.additionalNotes

                      // 3. Logica pentru Nume Furnizor
                      const supplierName =
                        item.supplierName ||
                        item.supplierId?.name ||
                        item.supplier?.name ||
                        (item.supplierId ? 'Fără Nume (Doar ID)' : '-')

                      return (
                        <TableRow key={index}>
                          {/* Coloana 1: Data Intrare */}
                          <TableCell>
                            {item.entryDate
                              ? format(new Date(item.entryDate), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>

                          {/* Coloana 2: Furnizor */}
                          <TableCell className='font-medium text-muted-foreground '>
                            {supplierName === 'Fără Nume (Doar ID)' ? (
                              <span className='text-xs text-muted-foreground italic'>
                                Furnizor Neidentificat
                              </span>
                            ) : (
                              supplierName
                            )}
                          </TableCell>

                          {/* Înlocuiește vechiul TableCell cu acesta: */}
                          <TableCell className='text-center'>
                            {hasQualityDetails ? (
                              <Dialog>
                                {/* Butonul care deschide modalul */}
                                <DialogTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0 hover:bg-blue-50'
                                  >
                                    <FileText className='h-4 w-4 ' />
                                  </Button>
                                </DialogTrigger>

                                {/* Fereastra Modală cu Detaliile */}
                                <DialogContent className='max-w-3xl'>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Detalii Calitate Lot Sursă
                                    </DialogTitle>
                                  </DialogHeader>

                                  {/* Cardul stilizat (copiat din exemplul tău) */}
                                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mt-2'>
                                    {/* 1. Certificate */}
                                    <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                                      <span className='text-sm font-medium text-muted-foreground'>
                                        Certificate Conformitate / Calitate:
                                      </span>
                                      <span className='font-semibold text-sm'>
                                        {q.certificateNumbers?.length
                                          ? q.certificateNumbers.join(', ')
                                          : '-'}
                                      </span>
                                    </div>

                                    {/* 2. Loturi */}
                                    <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                                      <span className='text-sm font-medium text-muted-foreground'>
                                        Șarje / Loturi Producție:
                                      </span>
                                      <span className='font-semibold text-sm'>
                                        {q.lotNumbers?.length
                                          ? q.lotNumbers.join(', ')
                                          : '-'}
                                      </span>
                                    </div>

                                    {/* 3. Rapoarte */}
                                    <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                                      <span className='text-sm font-medium text-muted-foreground'>
                                        Declarații / Rapoarte Încercări:
                                      </span>
                                      <span className='font-semibold text-sm'>
                                        {q.testReports?.length
                                          ? q.testReports.join(', ')
                                          : '-'}
                                      </span>
                                    </div>

                                    {/* 4. Note Adiționale */}
                                    <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                                      <span className='text-sm font-medium text-muted-foreground'>
                                        Note Adiționale:
                                      </span>
                                      <span className='font-semibold text-sm whitespace-pre-wrap'>
                                        {q.additionalNotes || '-'}
                                      </span>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className='text-muted-foreground'>-</span>
                            )}
                          </TableCell>
                          {/* Coloana 4: Cantitate */}
                          <TableCell className='text-right'>
                            <UnitDisplay
                              baseQuantity={item.quantity}
                              baseUnit={movement.unitMeasure || ''}
                              options={mainItemOptions || []}
                              className='font-medium'
                            />
                          </TableCell>

                          {/* Coloana 5: Cost Unitar */}
                          <TableCell className='text-right'>
                            {formatCurrency(item.unitCost || 0)}
                          </TableCell>

                          {/* Coloana 6: Valoare Lot */}
                          <TableCell className='text-right font-bold'>
                            {formatCurrency(
                              (Number(item.quantity) || 0) *
                                (Number(item.unitCost) || 0)
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Card Alternativ: Apare DOAR dacă NU avem loturi (ex: Servicii) */}
          {(!movement.costBreakdown || movement.costBreakdown.length === 0) && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle>Detalii Cost Serviciu / Ajustare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='bg-muted/20 p-4 rounded-md border border-dashed flex flex-col gap-2'>
                  <div className='flex items-center justify-between mt-2'>
                    <span className='font-semibold'>Cost Înregistrat:</span>
                    <Badge variant='outline' className='text-base px-3 py-1'>
                      {movement.lineCost && movement.lineCost > 0
                        ? formatCurrency(movement.lineCost)
                        : 'Fără Cost (0.00 RON)'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Card 3: Calitate - STILIZAT CA ÎN MODAL */}
          {movement.qualityDetails && (
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle>Detalii Note Calitate Lot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                  {/* 1. Certificate */}
                  <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      Certificate Conformitate / Calitate:
                    </span>
                    <span className='font-semibold text-sm'>
                      {movement.qualityDetails.certificateNumbers?.length
                        ? movement.qualityDetails.certificateNumbers.join(', ')
                        : '-'}
                    </span>
                  </div>

                  {/* 2. Loturi */}
                  <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      Șarje / Loturi Producție:
                    </span>
                    <span className='font-semibold text-sm'>
                      {movement.qualityDetails.lotNumbers?.length
                        ? movement.qualityDetails.lotNumbers.join(', ')
                        : '-'}
                    </span>
                  </div>

                  {/* 3. Rapoarte */}
                  <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      Declarații / Rapoarte Încercări:
                    </span>
                    <span className='font-semibold text-sm'>
                      {movement.qualityDetails.testReports?.length
                        ? movement.qualityDetails.testReports.join(', ')
                        : '-'}
                    </span>
                  </div>

                  {/* 4. Note Adiționale */}
                  <div className='rounded-md border bg-muted/30 p-4 flex flex-col gap-1.5'>
                    <span className='text-sm font-medium text-muted-foreground'>
                      Note Adiționale:
                    </span>
                    <span className='font-semibold text-sm whitespace-pre-wrap'>
                      {movement.qualityDetails.additionalNotes || '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coloana Dreapta (Side Info) */}
        <div className='lg:w-1/3 space-y-2'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle>Balanță Stoc</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 1. Rândul ÎNAINTE - Acum folosește UnitDisplay */}
              <div className='flex justify-between items-center py-2 border-b'>
                <span className='text-muted-foreground'>Înainte</span>
                <div className='font-mono text-right'>
                  <UnitDisplay
                    baseQuantity={movement.balanceBefore}
                    baseUnit={movement.unitMeasure || ''}
                    options={mainItemOptions}
                  />
                </div>
              </div>

              {/* 2. Rândul MIȘCARE (Neschimbat, doar logica ta existentă) */}
              <div className='flex justify-between items-center py-2 border-b bg-muted/20 px-2 -mx-2'>
                <span className='font-semibold'>Mișcare</span>
                <div className='flex gap-1 font-bold'>
                  <span
                    className={
                      IN_TYPES.has(movement.movementType)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {IN_TYPES.has(movement.movementType) ? '+' : '-'}
                  </span>
                  <UnitDisplay
                    baseQuantity={movement.quantity}
                    baseUnit={movement.unitMeasure || ''}
                    options={mainItemOptions}
                    className={
                      IN_TYPES.has(movement.movementType)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  />
                </div>
              </div>

              {/* 3. Rândul DUPĂ - Acum folosește UnitDisplay */}
              <div className='flex justify-between items-center py-2 pt-3'>
                <span className='text-muted-foreground font-semibold'>
                  După
                </span>
                <div className='font-mono font-bold text-lg text-right'>
                  <UnitDisplay
                    baseQuantity={movement.balanceAfter}
                    baseUnit={movement.unitMeasure || ''}
                    options={mainItemOptions}
                  />
                </div>
              </div>

              {/* 4. Preț Unitar (FIFO la ieșiri) */}
              <div className='flex justify-between py-2 border-b border-dashed'>
                <span className='text-muted-foreground text-sm'>
                  {/* Schimbăm eticheta dinamic dacă e ieșire */}
                  {!IN_TYPES.has(movement.movementType)
                    ? 'Preț Unitar (FIFO)'
                    : 'Preț Unitar'}
                </span>
                <span className='font-mono text-sm'>
                  {movement.unitCost
                    ? formatCurrency(movement.unitCost)
                    : '0.00 RON'}
                </span>
              </div>

              {/* 5. Valoare Totală */}
              <div className='flex justify-between py-2 border-b border-dashed'>
                <span className='text-muted-foreground text-sm font-medium'>
                  Valoare Totală
                </span>
                <span className='font-mono text-sm font-bold'>
                  {movement.lineCost
                    ? formatCurrency(movement.lineCost)
                    : '0.00 RON'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Facturile asociate */}
          {(
            (reference as any)?.invoices ||
            (reference as any)?.relatedInvoices ||
            []
          ).length > 0 && (
            <Card>
              <CardHeader className='pb-0'>
                <CardTitle>Facturi Asociate</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                {(
                  (reference as any)?.invoices ||
                  (reference as any)?.relatedInvoices
                ).map((inv: any, idx: number) => (
                  <div
                    key={idx}
                    className='bg-muted/30 p-3 rounded-md border text-sm flex flex-col gap-2'
                  >
                    {/* 1. Header: Serie + Date */}
                    <div className='flex justify-between items-start'>
                      <div className='flex flex-col'>
                        <span className='font-semibold text-primary'>
                          Seria {inv.series || 'Fără Serie'} nr.{' '}
                          {inv.number || '-'}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          {inv.date
                            ? format(new Date(inv.date), 'dd/MM/yyyy')
                            : '-'}
                        </span>
                      </div>
                      <div className='text-xs text-right'>
                        <span className='text-muted-foreground block'>
                          Scadență:
                        </span>
                        <span
                          className={
                            new Date(inv.dueDate) < new Date()
                              ? 'text-red-600 font-medium'
                              : ''
                          }
                        >
                          {inv.dueDate
                            ? format(new Date(inv.dueDate), 'dd/MM/yyyy')
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Separator subtil */}
                    <div className='border-t border-dashed my-1 opacity-50'></div>

                    {/* 2. Detalii Financiare (Grid) */}
                    <div className='grid grid-cols-2 gap-y-1 text-xs'>
                      <div className='text-muted-foreground'>Net (Bază):</div>
                      <div className='text-right font-medium'>
                        {formatCurrency(inv.amount || 0)}
                      </div>

                      <div className='text-muted-foreground'>
                        TVA {inv.vatRate ? `(${inv.vatRate}%)` : ''}:
                      </div>
                      <div className='text-right font-medium'>
                        {formatCurrency(inv.vatValue || 0)}
                      </div>
                    </div>

                    {/* 3. Total General */}
                    <div className='flex justify-between items-center bg-background/50 p-2 rounded border border-input/50 mt-1'>
                      <span className='font-semibold text-muted-foreground text-xs uppercase tracking-tight'>
                        Total Factură
                      </span>
                      <span className='font-bold text-base text-primary'>
                        {formatCurrency(inv.totalWithVat || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {/* Bloc Deliveries (Avize) - Se afișează doar dacă există date */}
          {/* Avize de Expediție (Deliveries) */}
          {((data?.reference as any)?.deliveries || []).length > 0 && (
            <Card>
              <CardHeader className='pb-0'>
                <CardTitle>Avize de Expediție</CardTitle>
              </CardHeader>
              <CardContent className='space-y-1'>
                {(data.reference as any).deliveries.map(
                  (del: any, idx: number) => {
                    // Logică extragere dată (Mongo object sau string)
                    const rawDate =
                      del.dispatchNoteDate?.$date || del.dispatchNoteDate
                    const dateObj = rawDate ? new Date(rawDate) : null

                    return (
                      <div
                        key={idx}
                        className='bg-muted/30 p-3 rounded-md border text-sm flex flex-col gap-2'
                      >
                        {/* 1. Header: Serie + Data */}
                        <div className='flex justify-between items-start'>
                          <div className='flex flex-col'>
                            <span className='font-semibold text-primary'>
                              Seria {del.dispatchNoteSeries || '-'} nr.{' '}
                              {del.dispatchNoteNumber || '-'}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {dateObj ? format(dateObj, 'dd/MM/yyyy') : '-'}
                            </span>
                          </div>
                          <div className='text-xs text-right'></div>
                        </div>

                        {/* Separator subtil */}
                        <div className='border-t border-dashed my-1 opacity-50'></div>

                        {/* 2. Detalii Logistice (Grid - echivalent Net/TVA) */}
                        <div className='grid grid-cols-2 gap-y-1 text-xs'>
                          <div className='text-muted-foreground'>Sofer:</div>
                          <div className='text-right font-medium'>
                            {del.driverName || '-'}
                          </div>

                          {/* Randul 1: Auto */}
                          <div className='text-muted-foreground'>Nr. Auto:</div>
                          <div className='text-right font-medium'>
                            {del.carNumber || '-'}
                          </div>

                          {/* Randul 2: Tip */}
                          <div className='text-muted-foreground'>Tip:</div>
                          <div className='text-right font-medium'>
                            {del.transportType === 'EXTERN_FURNIZOR'
                              ? 'Furnizor'
                              : del.transportType === 'INTERN'
                                ? 'Genesis'
                                : del.transportType === 'TERT'
                                  ? 'Terț'
                                  : del.transportType}
                          </div>

                          {/* Randul 3 (Condiționat): Nume Terț */}
                          {/* Apare DOAR daca e TERT și avem un nume */}
                          {del.transportType === 'TERT' &&
                            del.tertiaryTransporterDetails?.name && (
                              <>
                                <div className='text-muted-foreground'>
                                  Transportator:
                                </div>
                                <div className='text-right font-medium '>
                                  {del.tertiaryTransporterDetails.name}
                                  {del.tertiaryTransporterDetails.cui}
                                  {del.tertiaryTransporterDetails.regCom}
                                </div>
                              </>
                            )}
                        </div>

                        {/* 3. Total General (Cost Transport - echivalent Total Factură) */}
                        <div className='mt-2'>
                          {(() => {
                            // 1. Net Amount (Cost Transport)
                            const net = del.transportCost || 0
                            // 2. VAT Rate
                            const rate = del.transportVatRate || 0
                            // 3. VAT Value (Direct from DB or 0)
                            const vat = del.transportVatValue || 0
                            // 4. Total Gross Amount (Net + VAT)
                            const total = net + vat

                            return (
                              <>
                                {/* Grilă Detalii Net / TVA */}
                                <div className='grid grid-cols-2 gap-y-1 text-xs mb-1'>
                                  <div className='text-muted-foreground'>
                                    Cost Transport (Net):
                                  </div>
                                  <div className='text-right font-medium'>
                                    {formatCurrency(net)}
                                  </div>

                                  <div className='text-muted-foreground'>
                                    TVA {rate > 0 ? `(${rate}%)` : ''}:
                                  </div>
                                  <div className='text-right font-medium'>
                                    {formatCurrency(vat)}
                                  </div>
                                </div>

                                {/* Total General Transport */}
                                <div className='flex justify-between items-center bg-background/50 p-2 rounded border border-input/50'>
                                  <span className='font-semibold text-muted-foreground text-xs uppercase tracking-tight'>
                                    Total Transport
                                  </span>
                                  <span className='font-bold text-base text-primary'>
                                    {formatCurrency(total)}
                                  </span>
                                </div>
                              </>
                            )
                          })()}
                        </div>

                        {/* 4. Note (Opțional - apare doar dacă există) */}
                        {del.notes && (
                          <div className='text-xs text-muted-foreground italic mt-1 border-t pt-1 border-dashed opacity-75'>
                            Note: {del.notes}
                          </div>
                        )}
                      </div>
                    )
                  }
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className='flex justify-between border-b py-2 last:border-0'>
      <dt className='text-muted-foreground text-sm'>{label}</dt>
      <dd className='font-medium text-right text-sm max-w-[60%] truncate'>
        {value}
      </dd>
    </div>
  )
}
