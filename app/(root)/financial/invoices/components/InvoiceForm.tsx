'use client'

import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  InvoiceInput,
  InvoiceTotals,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { InvoiceInputSchema } from '@/lib/db/modules/financial/invoices/invoice.validator'
import { ISettingInput } from '@/lib/db/modules/setting/types'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { InvoiceFormHeader } from './form-sections/InvoiceFormHeader'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import { IAddress, IClientDoc } from '@/lib/db/modules/client/types'
import { addDays } from 'date-fns'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { InvoiceFormItems } from './form-sections/InvoiceFormItems'
import { SelectAvizeModal } from './form-sections/SelectAvizeModal'
import {
  IDeliveryNoteDoc,
  IDeliveryNoteLine,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.model'
import { round2 } from '@/lib/utils'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { createInvoice } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { useRouter } from 'next/navigation'

interface InvoiceFormProps {
  initialData: Partial<InvoiceInput> | null
  companySettings: ISettingInput
  seriesList: SeriesDTO[]
  vatRates: VatRateDTO[]
}

export function InvoiceForm({
  initialData,
  companySettings,
  seriesList,
  vatRates,
}: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<IClientDoc | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<IAddress | null>(null)
  const [showNoteLoaderModal, setShowNoteLoaderModal] = useState(false)
  const [loadedNotes, setLoadedNotes] = useState<{ id: string; ref: string }[]>(
    []
  )
  const router = useRouter()

  const defaultValues: Partial<InvoiceInput> = {
    invoiceDate: new Date(),
    dueDate: new Date(),
    items: [],
    totals: {
      productsSubtotal: 0,
      productsVat: 0,
      productsCost: 0,
      productsProfit: 0,
      productsMargin: 0,
      packagingSubtotal: 0,
      packagingVat: 0,
      packagingCost: 0,
      packagingProfit: 0,
      packagingMargin: 0,
      servicesSubtotal: 0,
      servicesVat: 0,
      servicesCost: 0,
      servicesProfit: 0,
      servicesMargin: 0,
      manualSubtotal: 0,
      manualVat: 0,
      manualCost: 0,
      manualProfit: 0,
      manualMargin: 0,
      subtotal: 0,
      vatTotal: 0,
      grandTotal: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
    },
    sourceDeliveryNotes: [],
    notes: '',
    rejectionReason: '',
    seriesName: seriesList && seriesList.length > 0 ? seriesList[0].name : '',
  }

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(InvoiceInputSchema),
    defaultValues: initialData
      ? { ...defaultValues, ...initialData }
      : defaultValues,
  })

  const { setValue, getValues } = form

  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // --- Urmărirea câmpurilor ---
  const watchedItems = useWatch({ control: form.control, name: 'items' })
  const watchedClientId = useWatch({
    control: form.control,
    name: 'clientId',
  })
  const watchedInvoiceDate = useWatch({
    control: form.control,
    name: 'invoiceDate',
  })

  useEffect(() => {
    if (!watchedItems) return

    const newTotals = watchedItems.reduce(
      (acc, item) => {
        const lineValue = item?.lineValue || 0
        const vatValue = item?.vatRateDetails?.value || 0
        const lineCost =
          item.productCode === 'MANUAL' ? 0 : item?.lineCostFIFO || 0
        const lineProfit = lineValue - lineCost

        // NOUA LOGICĂ DE CLASIFICARE
        if (item.productCode === 'MANUAL') {
          acc.manualSubtotal += lineValue
          acc.manualVat += vatValue
          acc.manualCost += lineCost
          acc.manualProfit += lineProfit
        } else if (item.serviceId) {
          acc.servicesSubtotal += lineValue
          acc.servicesVat += vatValue
          acc.servicesCost += lineCost
          acc.servicesProfit += lineProfit
        } else if (item.stockableItemType === 'Packaging') {
          acc.packagingSubtotal += lineValue
          acc.packagingVat += vatValue
          acc.packagingCost += lineCost
          acc.packagingProfit += lineProfit
        } else {
          // Implicit este Produs
          acc.productsSubtotal += lineValue
          acc.productsVat += vatValue
          acc.productsCost += lineCost
          acc.productsProfit += lineProfit
        }

        return acc
      },
      {
        // Resetăm totul
        productsSubtotal: 0,
        productsVat: 0,
        productsCost: 0,
        productsProfit: 0,
        productsMargin: 0,
        packagingSubtotal: 0,
        packagingVat: 0,
        packagingCost: 0,
        packagingProfit: 0,
        packagingMargin: 0,
        servicesSubtotal: 0,
        servicesVat: 0,
        servicesCost: 0,
        servicesProfit: 0,
        servicesMargin: 0,
        manualSubtotal: 0,
        manualVat: 0,
        manualCost: 0,
        manualProfit: 0,
        manualMargin: 0,
        subtotal: 0,
        vatTotal: 0,
        grandTotal: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
      } as InvoiceTotals
    )

    // --- Calculăm Totalurile Generale și Marjele ---
    newTotals.subtotal = round2(
      newTotals.productsSubtotal +
        newTotals.servicesSubtotal +
        newTotals.manualSubtotal +
        newTotals.packagingSubtotal
    )
    newTotals.vatTotal = round2(
      newTotals.productsVat +
        newTotals.servicesVat +
        newTotals.manualVat +
        newTotals.packagingVat
    )
    newTotals.grandTotal = round2(newTotals.subtotal + newTotals.vatTotal)
    newTotals.totalCost = round2(
      newTotals.productsCost +
        newTotals.servicesCost +
        newTotals.manualCost +
        newTotals.packagingCost
    )
    newTotals.totalProfit = round2(
      newTotals.productsProfit +
        newTotals.servicesProfit +
        newTotals.manualProfit +
        newTotals.packagingProfit
    )

    // Marjele %
    newTotals.productsMargin =
      newTotals.productsSubtotal > 0
        ? round2((newTotals.productsProfit / newTotals.productsSubtotal) * 100)
        : 0
    newTotals.packagingMargin =
      newTotals.packagingSubtotal > 0
        ? round2(
            (newTotals.packagingProfit / newTotals.packagingSubtotal) * 100
          )
        : 0
    newTotals.servicesMargin =
      newTotals.servicesSubtotal > 0
        ? round2((newTotals.servicesProfit / newTotals.servicesSubtotal) * 100)
        : 0
    newTotals.manualMargin =
      newTotals.manualSubtotal > 0
        ? round2((newTotals.manualProfit / newTotals.manualSubtotal) * 100)
        : 0
    newTotals.profitMargin =
      newTotals.subtotal > 0
        ? round2((newTotals.totalProfit / newTotals.subtotal) * 100)
        : 0

    // Rotunjim totul
    Object.keys(newTotals).forEach((key) => {
      newTotals[key as keyof InvoiceTotals] = round2(
        newTotals[key as keyof InvoiceTotals]
      )
    })

    setValue('totals', newTotals, {
      shouldValidate: false,
      shouldDirty: true,
    })
  }, [watchedItems, setValue])

  useEffect(() => {
    async function fetchClientData(clientId: string) {
      try {
        const clientData = await getClientById(clientId)
        setSelectedClient(clientData)
        setValue('clientSnapshot', {
          name: clientData.name,
          cui: clientData.vatId || clientData.cnp || '',
          regCom: clientData.nrRegComert || '',
          address: {
            judet: clientData.address.judet,
            localitate: clientData.address.localitate,
            strada: clientData.address.strada,
            numar: clientData.address.numar || '',
            codPostal: clientData.address.codPostal,
            tara: clientData.address.tara || 'RO',
            alteDetalii: clientData.address.alteDetalii || '',
          },
          bank: clientData.bankAccountLei?.bankName || '',
          iban: clientData.bankAccountLei?.iban || '',
        })

        const invoiceDate = getValues('invoiceDate') || new Date()
        const paymentTerm = clientData.paymentTerm || 0
        setValue('dueDate', addDays(invoiceDate, paymentTerm))
      } catch (error) {
        toast.error('Eroare la preluarea datelor clientului.')
        console.error(error)
        setSelectedClient(null)
      }
    }
    if (watchedClientId && watchedClientId !== selectedClient?._id.toString()) {
      fetchClientData(watchedClientId)
    } else if (!watchedClientId) {
      setSelectedClient(null)
      setSelectedAddress(null)
      setValue('clientSnapshot', undefined)
    }
  }, [watchedClientId, selectedClient, getValues, setValue])

  // ... (useEffect pentru scadență)
  useEffect(() => {
    if (selectedClient && watchedInvoiceDate) {
      const paymentTerm = selectedClient.paymentTerm || 0
      setValue('dueDate', addDays(watchedInvoiceDate, paymentTerm))
    }
  }, [watchedInvoiceDate, selectedClient, setValue])

  const handleLoadNotes = (selectedNotes: IDeliveryNoteDoc[]) => {
    remove()
    const newInvoiceItems = selectedNotes.flatMap((note) =>
      note.items.map((item: IDeliveryNoteLine) => {
        // Calculăm profitul liniei AICI
        const lineValue = item?.lineValue || 0
        const lineCost =
          item.productCode === 'MANUAL' ? 0 : item?.lineCostFIFO || 0
        const lineProfit = round2(lineValue - lineCost)
        const lineMargin =
          lineValue > 0 ? round2((lineProfit / lineValue) * 100) : 0

        // Returnăm obiectul complet
        return {
          sourceDeliveryNoteId: note._id.toString(),
          sourceDeliveryNoteLineId: item._id?.toString() || undefined,
          productId: item.productId?.toString(),
          serviceId: item.serviceId?.toString(),
          stockableItemType: item.stockableItemType,
          isManualEntry: item.isManualEntry,
          productName: item.productName,
          productCode: item.productCode,
          codNC: item.codNC,
          quantity: item.quantity,
          unitOfMeasure: item.unitOfMeasure,
          unitOfMeasureCode: item.unitOfMeasureCode,
          unitPrice: item.priceAtTimeOfOrder,
          vatRateDetails: item.vatRateDetails,
          lineValue: lineValue, 
          lineTotal: item.lineTotal,
          baseUnit: item.baseUnit,
          conversionFactor: item.conversionFactor || 1,
          quantityInBaseUnit: item.quantityInBaseUnit,
          priceInBaseUnit: item.priceInBaseUnit,
          minimumSalePrice: item.minimumSalePrice,
          packagingOptions: item.packagingOptions || [],
          lineCostFIFO: lineCost,
          lineProfit: lineProfit,
          lineMargin: lineMargin, 
          costBreakdown: (item.costBreakdown || []).map((cb) => ({
            movementId: cb.movementId?.toString(),
            entryDate: new Date(cb.entryDate),
            quantity: cb.quantity,
            unitCost: cb.unitCost,
            type: cb.type,
          })),
        }
      })
    )

    append(newInvoiceItems)

    setValue(
      'sourceDeliveryNotes',
      selectedNotes.map((n) => n._id.toString())
    )
    setLoadedNotes(
      selectedNotes.map((n) => ({
        id: n._id.toString(),
        ref: `${n.seriesName}-${n.noteNumber}`,
      }))
    )
    toast.success(
      `${newInvoiceItems.length} linii au fost încărcate din ${selectedNotes.length} avize.`
    )
    setShowNoteLoaderModal(false)
  }

  const handleRemoveNote = (noteIdToRemove: string) => {
    const currentItems = getValues('items')
    const indicesToRemove = currentItems
      .map((item, index) =>
        item.sourceDeliveryNoteId === noteIdToRemove ? index : -1
      )
      .filter((index) => index !== -1)
      .reverse()
    if (indicesToRemove.length > 0) {
      remove(indicesToRemove)
    }
    setLoadedNotes((prev) => prev.filter((n) => n.id !== noteIdToRemove))
    const newSourceIds = getValues('sourceDeliveryNotes').filter(
      (id) => id !== noteIdToRemove
    )
    setValue('sourceDeliveryNotes', newSourceIds)
    toast.info('Avizul și liniile asociate au fost scoase din factură.')
  }

  async function onSubmit(values: InvoiceInput) {
    // console.log(
    //   'DATE TRIMISE DE LA CLIENT:',
    //   JSON.stringify(values.items, null, 2)
    // )

    setIsLoading(true)
    const loadingToastId = toast.loading('Se salvează factura...') // 1. Capturăm ID-ul toast-ului

    try {
      const result = await createInvoice(values, 'CREATED')

      if (result.success) {
        // 2. Oprim loader-ul TOAST și afișăm succesul
        toast.dismiss(loadingToastId)
        toast.success(
          `Factura ${result.data.invoiceNumber} a fost creată cu succes.`
        )

        // 3. Oprim starea de încărcare a butonului ÎNAINTE de redirect
        setIsLoading(false)

        // 4. Facem redirect-ul
        router.push('/financial/invoices')
      } else {
        toast.dismiss(loadingToastId)
        toast.error('Eroare la salvare:', { description: result.message })
        setIsLoading(false)
      }
    } catch {
      toast.dismiss(loadingToastId)
      toast.error('A apărut o eroare neașteptată în comunicarea cu serverul.')
      setIsLoading(false)
    }
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <InvoiceFormHeader
            companySettings={companySettings}
            seriesList={seriesList}
            selectedClient={selectedClient}
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
            onShowNoteLoader={() => setShowNoteLoaderModal(true)}
          />
          <InvoiceFormItems
            fields={fields}
            remove={remove}
            append={append}
            loadedNotes={loadedNotes}
            onRemoveNote={handleRemoveNote}
            vatRates={vatRates}
          />

          <Button type='submit' disabled={isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Salvează Factura
          </Button>
        </form>
      </Form>

      {showNoteLoaderModal &&
        selectedClient &&
        selectedAddress &&
        selectedAddress._id && (
          <SelectAvizeModal
            clientId={selectedClient._id.toString()}
            addressId={selectedAddress._id.toString()}
            onClose={() => setShowNoteLoaderModal(false)}
            onConfirm={handleLoadNotes}
          />
        )}
    </FormProvider>
  )
}
