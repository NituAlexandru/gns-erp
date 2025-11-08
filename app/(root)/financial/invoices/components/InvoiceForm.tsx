'use client'

import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  InvoiceActionResult,
  InvoiceInput,
  InvoiceLineInput,
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
import {
  createInvoice,
  createStornoInvoice,
  generateStornoLinesForQuantity,
  getLinesFromInvoices,
  getStornoSourceInvoices,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
import { useRouter } from 'next/navigation'
import { SearchedService } from '@/lib/db/modules/setting/services/types'
import { SelectStornoInvoicesModal } from './form-sections/SelectStornoInvoicesModal'
import { getActiveSeriesForDocumentType } from '@/lib/db/modules/numbering/numbering.actions'
import { CreateStornoInput } from '@/lib/db/modules/financial/invoices/storno.validator'
import { SelectStornoProductModal } from './form-sections/SelectStornoProductModal'

interface InvoiceFormProps {
  initialData: Partial<InvoiceInput> | null
  companySettings: ISettingInput
  seriesList: SeriesDTO[]
  vatRates: VatRateDTO[]
  services: SearchedService[]
}

export function InvoiceForm({
  initialData,
  companySettings,
  seriesList,
  vatRates,
  services,
}: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<IClientDoc | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<IAddress | null>(null)
  const [showNoteLoaderModal, setShowNoteLoaderModal] = useState(false)
  const [showStornoModal, setShowStornoModal] = useState(false)
  const [showStornoProductModal, setShowStornoProductModal] = useState(false)
  const [loadedNotes, setLoadedNotes] = useState<{ id: string; ref: string }[]>(
    []
  )
  const [loadedStornoSources, setLoadedStornoSources] = useState<
    { id: string; ref: string }[]
  >([])
  const router = useRouter()

  const defaultValues: Partial<InvoiceInput> = {
    invoiceDate: new Date(),
    dueDate: new Date(),
    invoiceType: 'STANDARD',
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
  const watchedDeliveryAddressId = form.watch('deliveryAddressId')

  useEffect(() => {
    if (!watchedItems) return

    const newTotals = watchedItems.reduce(
      (acc: InvoiceTotals, item: InvoiceLineInput) => {
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

  useEffect(() => {
    if (selectedAddress) {
      // Setează valorile în formular pentru validare și submit
      form.setValue('deliveryAddressId', selectedAddress._id as string)
      form.setValue('deliveryAddress', {
        judet: selectedAddress.judet,
        localitate: selectedAddress.localitate,
        strada: selectedAddress.strada,
        numar: selectedAddress.numar || '',
        codPostal: selectedAddress.codPostal,
        tara: selectedAddress.tara || 'RO',
        alteDetalii: selectedAddress.alteDetalii || '',
      })
    } else {
      // Resetează câmpurile dacă adresa e anulată
      form.resetField('deliveryAddressId')
      form.resetField('deliveryAddress')
    }
    // Trebuie să urmărim 'selectedAddress' și să avem acces la 'form'
  }, [selectedAddress, form])

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
          stornedQuantity: 0,
          relatedAdvanceId: undefined,
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
  const handleLoadStornoInvoices = async (selectedInvoiceIds: string[]) => {
    if (isLoading) return
    setIsLoading(true)
    const toastId = toast.loading('Se încarcă liniile pentru stornare...')

    try {
      const result = await getLinesFromInvoices(selectedInvoiceIds)

      if (result.success) {
        // 1. Convertim datele înapoi în obiecte Date
        const linesWithDates = result.data.lines.map(
          (line: InvoiceLineInput) => ({
            ...line,
            costBreakdown: line.costBreakdown.map((cb) => ({
              ...cb,
              entryDate: new Date(cb.entryDate),
            })),
          })
        )

        // 2. Adaugă liniile corectate
        append(linesWithDates)

        // 3. Setează antetul formularului (codul tău existent)

        setValue('clientId', result.data.header.clientId)
        setValue('clientSnapshot', result.data.header.clientSnapshot)
        setValue('deliveryAddressId', result.data.header.deliveryAddressId)
        setValue('deliveryAddress', result.data.header.deliveryAddress)
        setValue('salesAgentId', result.data.header.salesAgentId)
        setValue('salesAgentSnapshot', result.data.header.salesAgentSnapshot)
        setValue('relatedInvoiceIds', selectedInvoiceIds)

        const sourceInvoices = await getStornoSourceInvoices(
          result.data.header.clientId,
          result.data.header.deliveryAddressId
        )
        if (sourceInvoices.success) {
          setLoadedStornoSources(
            sourceInvoices.data
              .filter((inv) => selectedInvoiceIds.includes(inv._id))
              .map((inv) => ({
                id: inv._id,
                ref: `${inv.seriesName}-${inv.invoiceNumber}`,
              }))
          )
        }

        toast.success(
          `${result.data.lines.length} linii de stornat au fost încărcate.`,
          { id: toastId }
        )
        setShowStornoModal(false)
      } else {
        toast.error('Eroare la încărcarea liniilor', {
          id: toastId,
          description: result.message,
        })
      }
    } catch (error) {
      toast.error('Eroare neașteptată', {
        id: toastId,
        description: (error as Error).message,
      })
    } finally {
      setIsLoading(false)
    }
  }
  const handleLoadStornoLines = async (
    productId: string,
    quantityToStorno: number
  ) => {
    if (!watchedClientId || !watchedDeliveryAddressId) {
      toast.error('Clientul sau adresa de livrare nu sunt selectate.', {
        description:
          'Vă rugăm să selectați un client și o adresă înainte de a stornare.',
      })
      return 
    }
    setIsLoading(true) 
    const toastId = toast.loading('Se generează liniile storno...', {
      description: `Cantitate: ${quantityToStorno}, Produs ID: ${productId}`,
    })

    try {
      const result = await generateStornoLinesForQuantity(
        watchedClientId,
        watchedDeliveryAddressId,
        productId,
        quantityToStorno
      )

      if (result.success) {
        // 1. Convertim datele 
        const linesWithDates = result.data.lines.map(
          (line: InvoiceLineInput) => ({
            ...line,
            costBreakdown: (line.costBreakdown || []).map((cb) => ({
              ...cb,
              entryDate: new Date(cb.entryDate), // Conversia
            })),
          })
        )

        // 2. ADĂUGĂM liniile
        append(linesWithDates)

        // 3. Actualizăm ID-urile facturilor sursă (adăugăm, nu suprascriem)
        const currentIds = new Set(getValues('relatedInvoiceIds') || [])
        result.data.sourceInvoiceIds.forEach((id) => currentIds.add(id))
        setValue('relatedInvoiceIds', Array.from(currentIds), {
          shouldDirty: true,
        })

        // 4. Actualizăm badge-urile (opțional, dar util)
        const sourceInvoices = await getStornoSourceInvoices(
          watchedClientId,
          watchedDeliveryAddressId
        )
        if (sourceInvoices.success) {
          setLoadedStornoSources(
            sourceInvoices.data
              .filter((inv) => currentIds.has(inv._id))
              .map((inv) => ({
                id: inv._id,
                ref: `${inv.seriesName}-${inv.invoiceNumber}`,
              }))
          )
        }

        // 5. Feedback de succes
        toast.success('Linii storno adăugate cu succes.', {
          id: toastId,
          description: `Generat din: ${result.data.sourceInvoiceRefs.join(', ')}`,
        })
        setShowStornoProductModal(false) 
      } else {
        // Eroare de la server
        toast.error('Eroare la generarea liniilor', {
          id: toastId,
          description: result.message,
        })
      }
    } catch (error) {
      // Eroare neașteptată
      toast.error('Eroare neașteptată', {
        id: toastId,
        description: (error as Error).message,
      })
    } finally {
      setIsLoading(false) // Deblochează butonul Salvare
    }
  }
  const handleRemoveNote = (noteIdToRemove: string) => {
    const currentItems = getValues('items')
    const indicesToRemove = currentItems
      .map((item: InvoiceLineInput, index: number) =>
        item.sourceDeliveryNoteId === noteIdToRemove ? index : -1
      )
      .filter((index: number) => index !== -1)
      .reverse()
    if (indicesToRemove.length > 0) {
      remove(indicesToRemove)
    }
    setLoadedNotes((prev) => prev.filter((n) => n.id !== noteIdToRemove))
    const newSourceIds = getValues('sourceDeliveryNotes').filter(
      (id: string) => id !== noteIdToRemove
    )
    setValue('sourceDeliveryNotes', newSourceIds)
    toast.info('Avizul și liniile asociate au fost scoase din factură.')
  }

  const handleRemoveStornoSource = (invoiceIdToRemove: string) => {
    // 1. Găsește indicii liniilor care trebuie șterse
    const currentItems = getValues('items')
    const indicesToRemove: number[] = []

    currentItems.forEach((item: InvoiceLineInput, index: number) => {
      // Verifică noul câmp pe care l-am adăugat
      if (item.sourceInvoiceId === invoiceIdToRemove) {
        indicesToRemove.push(index)
      }
    })

    // 2. Șterge liniile (trebuie în ordine inversă pentru a nu strica indicii)
    if (indicesToRemove.length > 0) {
      remove(indicesToRemove.reverse())
    }

    // 3. Actualizează starea pentru relatedInvoiceIds (folosită la submit)
    const remainingSourceInvoices = getValues('relatedInvoiceIds').filter(
      (id: string) => id !== invoiceIdToRemove
    )
    setValue('relatedInvoiceIds', remainingSourceInvoices)

    // 4. Actualizează starea pentru badge-uri (vizual)
    setLoadedStornoSources((prev) =>
      prev.filter((inv) => inv.id !== invoiceIdToRemove)
    )

    toast.info('Factura sursă și liniile asociate au fost eliminate.')
  }

  async function onSubmit(values: InvoiceInput) {
    setIsLoading(true)
    const loadingToastId = toast.loading('Se salvează factura...')

    try {
      let result: InvoiceActionResult
      if (values.invoiceType === 'STORNO') {
        // --- CAZUL 1: E FACTURĂ STORNO ---

        // 1. Găsim o serie validă pentru Nota de Retur (fără hardcodare)
        const returnNoteSeriesList = (await getActiveSeriesForDocumentType(
          'NotaRetur' as unknown as DocumentType
        )) as SeriesDTO[]

        if (!returnNoteSeriesList || returnNoteSeriesList.length === 0) {
          toast.error(
            'Eroare Critică: Nu există serii active pentru "NotaRetur".',
            {
              id: loadingToastId,
              description: 'Vă rugăm configurați o serie în Setări.',
            }
          )
          setIsLoading(false)
          return
        }

        const returnNoteSeriesName = returnNoteSeriesList[0].name

        // 2. Facem cast la tipul de Storno (care e mai strict)
        const stornoData = {
          ...values,
          invoiceType: 'STORNO',
          returnNoteSeriesName: returnNoteSeriesName,
          salesAgentId: values.salesAgentId,
          salesAgentSnapshot: values.salesAgentSnapshot,
        } as CreateStornoInput

        // 3. Apelăm noua acțiune de stornare
        result = await createStornoInvoice(stornoData)
      } else {
        // --- CAZUL 2: E FACTURĂ STANDARD sau AVANS ---
        result = await createInvoice(values, 'CREATED')
      }

      if (result.success) {
        toast.dismiss(loadingToastId)

        const successMessage =
          values.invoiceType === 'STORNO'
            ? `Factura Storno ${result.data.invoiceNumber} a fost creată.`
            : `Factura ${result.data.invoiceNumber} a fost creată.`

        toast.success(successMessage)
        // 🔼 --- SFÂRȘIT CORECȚIE --- 🔼

        setIsLoading(false)
        router.push('/financial/invoices')
      } else {
        toast.dismiss(loadingToastId)
        toast.error('Eroare la salvare:', { description: result.message })
        setIsLoading(false)
      }
    } catch (error) {
      toast.dismiss(loadingToastId)
      toast.error('A apărut o eroare neașteptată.', {
        description: (error as Error).message,
      })
      setIsLoading(false)
    }
  }

  const onValidationErrors = () => {
    toast.error('Formularul este invalid!', {
      description: 'Vă rugăm verificați câmpurile marcate cu roșu.',
    })
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onValidationErrors)}
          className='space-y-4'
        >
          <InvoiceFormHeader
            companySettings={companySettings}
            seriesList={seriesList}
            selectedClient={selectedClient}
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
            onShowNoteLoader={() => setShowNoteLoaderModal(true)}
            initialData={initialData}
          />
          <InvoiceFormItems
            fields={fields}
            remove={remove}
            append={append}
            loadedNotes={loadedNotes}
            onRemoveNote={handleRemoveNote}
            vatRates={vatRates}
            services={services}
            onShowStornoModal={() => setShowStornoModal(true)}
            onShowStornoProductModal={() => setShowStornoProductModal(true)}
            loadedStornoSources={loadedStornoSources}
            onRemoveStornoSource={handleRemoveStornoSource}
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

      {showStornoModal && watchedClientId && watchedDeliveryAddressId && (
        <SelectStornoInvoicesModal
          clientId={watchedClientId}
          addressId={watchedDeliveryAddressId}
          onClose={() => setShowStornoModal(false)}
          onConfirm={handleLoadStornoInvoices}
        />
      )}
      {showStornoProductModal &&
        watchedClientId &&
        watchedDeliveryAddressId && (
          <SelectStornoProductModal
            clientId={watchedClientId}
            addressId={watchedDeliveryAddressId}
            onClose={() => setShowStornoProductModal(false)}
            onConfirm={handleLoadStornoLines}
          />
        )}
    </FormProvider>
  )
}
