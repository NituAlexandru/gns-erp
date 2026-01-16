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
import { Loader2, SplitIcon, Trash2 } from 'lucide-react'
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
import { formatCurrency, round2 } from '@/lib/utils'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  createInvoice,
  createStornoInvoice,
  generateStornoLinesForQuantity,
  getLinesFromInvoices,
  getStornoSourceInvoices,
  updateInvoice,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
import { useRouter } from 'next/navigation'
import { SearchedService } from '@/lib/db/modules/setting/services/types'
import { SelectStornoInvoicesModal } from './form-sections/SelectStornoInvoicesModal'
import { getActiveSeriesForDocumentType } from '@/lib/db/modules/numbering/numbering.actions'
import { CreateStornoInput } from '@/lib/db/modules/financial/invoices/storno.validator'
import { SelectStornoProductModal } from './form-sections/SelectStornoProductModal'
import { VAT_EXEMPTION_REASONS } from '@/lib/db/modules/setting/efactura/outgoing/outgoing.constants'
import {
  cancelSplitGroup,
  createSplitInvoices,
  getSplitGroupPreview,
} from '@/lib/db/modules/financial/invoices/split-invoice/split-invoice.actions'
import { SplitInvoiceModal } from './form-sections/SplitInvoiceModal'
import { useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface InvoiceFormProps {
  initialData: (Partial<InvoiceInput> & { _id?: string }) | null
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
  const { data: session } = useSession()
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
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showCancelAlert, setShowCancelAlert] = useState(false)
  // Folosim direct variabila asta existentă
  const isSplitGroupMember = !!initialData?.splitGroupId
  const isEditSplitMode = isSplitGroupMember
  const defaultValues: Partial<InvoiceInput> = {
    invoiceDate: new Date(),
    dueDate: new Date(),
    invoiceType: 'STANDARD',
    vatCategory: 'S',
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
  const [groupInvoicesList, setGroupInvoicesList] = useState<any[]>([])

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

  const watchedVatCategory = useWatch({
    control: form.control,
    name: 'vatCategory',
  })

  // 2. useEffect pentru a gestiona schimbarea regimului TVA
  useEffect(() => {
    // Dacă nu avem o categorie selectată, nu facem nimic
    if (!watchedVatCategory) return

    // Obținem motivul standard pentru codul selectat
    const defaultReason = VAT_EXEMPTION_REASONS[watchedVatCategory] || ''

    // Setăm motivul scutirii în formular (dacă nu e Standard, se completează singur)
    // Putem pune o condiție: suprascriem doar dacă câmpul e gol sau e un mesaj standard vechi,
    // ca să nu ștergem ce a scris omul manual. Dar pentru simplitate, momentan îl setăm direct.
    setValue('vatExemptionReason', defaultReason, { shouldDirty: true })

    // LOGICA DE FORȚARE A LINIILOR LA 0%
    if (watchedVatCategory !== 'S') {
      const currentItems = getValues('items')

      // Verificăm dacă avem linii care au TVA diferit de 0
      const needsUpdate = currentItems.some(
        (item) => item.vatRateDetails.rate !== 0
      )

      if (needsUpdate) {
        const updatedItems = currentItems.map((item) => {
          // Dacă e deja 0, îl lăsăm așa
          if (item.vatRateDetails.rate === 0) return item

          // Recalculăm linia cu TVA 0
          const newValue = item.lineValue // Valoarea fără TVA rămâne la fel
          const newLineTotal = newValue // Totalul devine egal cu valoarea

          return {
            ...item,
            vatRateDetails: { rate: 0, value: 0 },
            lineTotal: newLineTotal,
            // lineCost și profit rămân neschimbate
          }
        })

        // Actualizăm tot array-ul de itemi o singură dată
        setValue('items', updatedItems, {
          shouldValidate: true,
          shouldDirty: true,
        })
        toast.info(
          `Cota TVA a fost schimbată automat la 0% pentru regimul ${watchedVatCategory}.`
        )
      }
    }
  }, [watchedVatCategory, setValue, getValues])

  const handleLoadNotes = (selectedNotes: IDeliveryNoteDoc[]) => {
    // 1. Obține starea curentă
    const currentSourceNoteIds = new Set(getValues('sourceDeliveryNotes') || [])

    // 2. Filtrează avizele care SUNT DEJA pe factură
    const newNotesToAdd = selectedNotes.filter(
      (note) => !currentSourceNoteIds.has(note._id.toString())
    )

    // 3. Verifică dacă am rămas cu ceva de adăugat
    if (newNotesToAdd.length === 0) {
      toast.info('Toate avizele selectate sunt deja încărcate.')
      setShowNoteLoaderModal(false)
      return
    }

    // 4. Procesează DOAR avizele noi
    const newInvoiceItems = newNotesToAdd.flatMap((note) =>
      note.items.map((item: IDeliveryNoteLine) => {
        const lineValue = item?.lineValue || 0
        const lineCost =
          item.productCode === 'MANUAL' ? 0 : item?.lineCostFIFO || 0
        const lineProfit = round2(lineValue - lineCost)
        const lineMargin =
          lineValue > 0 ? round2((lineProfit / lineValue) * 100) : 0

        // Returnăm obiectul complet (logica ta existentă e corectă)
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

    // 5. Adaugă (append) liniile noi la cele existente (FĂRĂ remove())
    append(newInvoiceItems)

    // 6. Combină ID-urile avizelor sursă (vechi + noi)
    const newSourceIds = newNotesToAdd.map((n) => n._id.toString())
    setValue(
      'sourceDeliveryNotes',
      [...Array.from(currentSourceNoteIds), ...newSourceIds], // Folosim Set-ul
      { shouldDirty: true }
    )

    // 7. Combină referințele pentru badge-uri (vechi + noi)
    const newLoadedNotes = newNotesToAdd.map((n) => ({
      id: n._id.toString(),
      ref: `${n.seriesName}-${n.noteNumber}`,
    }))
    setLoadedNotes((prev) => [...prev, ...newLoadedNotes])

    // 8. Feedback
    toast.success(
      `${newInvoiceItems.length} linii au fost adăugate din ${newNotesToAdd.length} avize noi.`
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

        const currentItems = getValues('items')
        const newLinesToAdd: InvoiceLineInput[] = []
        let duplicateCount = 0

        for (const newLine of linesWithDates) {
          // Verificăm dacă există deja o linie cu același ID de linie sursă
          const isDuplicate = currentItems.some(
            (existingItem) =>
              existingItem.sourceInvoiceLineId === newLine.sourceInvoiceLineId
          )

          if (isDuplicate) {
            duplicateCount++
          } else {
            newLinesToAdd.push(newLine)
          }
        }

        if (duplicateCount > 0) {
          toast.warning(
            `${duplicateCount} linii au fost ignorate deoarece sunt deja incluse în factură.`,
            {
              description:
                'Dacă doriți să modificați cantitatea, editați linia existentă.',
            }
          )
        }

        if (newLinesToAdd.length === 0) {
          setIsLoading(false)
          setShowStornoProductModal(false)
          return // Nu mai facem nimic dacă totul e duplicat
        }

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

      // 🔽 --- AICI ESTE LOGICA NOUĂ --- 🔽
      if (initialData && initialData._id) {
        // --- CAZUL 1: SUNTEM ÎN MODUL EDITARE ---
        // (initialData a fost primit ca prop)

        result = await updateInvoice(initialData._id.toString(), values)
      } else if (values.invoiceType === 'STORNO') {
        // --- CAZUL 2: SUNTEM ÎN MODUL CREARE (Flux B sau C) ---

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

        // 2. Facem cast la tipul de Storno
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
        // --- CAZUL 3: SUNTEM ÎN MODUL CREARE (Standard sau Avans) ---
        result = await createInvoice(values, 'CREATED')
      }
      // 🔼 --- SFÂRȘIT LOGICĂ NOUĂ --- 🔼

      // --- Logica de Răspuns (e aceeași, dar am adaptat mesajul) ---
      if (result.success) {
        toast.dismiss(loadingToastId)

        // Mesaj de succes adaptat
        const successMessage = initialData
          ? `Factura ${result.data.invoiceNumber} a fost modificată.`
          : values.invoiceType === 'STORNO'
            ? `Factura Storno ${result.data.invoiceNumber} a fost creată.`
            : `Factura ${result.data.invoiceNumber} a fost creată.`

        toast.success(successMessage)

        setIsLoading(false)
        router.push('/financial/invoices') // Ne întoarcem la listă
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
  const handleSplitConfirm = async (
    configs: { clientId: string; percentage: number }[]
  ) => {
    // Validare de bază (doar pentru split nou, la editare avem items din groupData)
    const currentItems = getValues('items')
    if (!isEditSplitMode && (!currentItems || currentItems.length === 0)) {
      toast.error('Nu puteți face split pe o factură goală.')
      return
    }

    const formValues = getValues()
    let finalAgentSnapshot = formValues.salesAgentSnapshot
    let finalAgentId = formValues.salesAgentId

    if (!finalAgentSnapshot?.name) {
      if (session?.user) {
        finalAgentId = session.user.id
        finalAgentSnapshot = {
          name: session.user.name || 'Utilizator necunoscut',
        }
      } else {
        toast.error('Eroare: Agent neidentificat.')
        return
      }
    }

    // Pregătire Date Comune
    const {
      clientId,
      clientSnapshot,
      items,
      totals,
      salesAgentSnapshot,
      salesAgentId,
      ...restData
    } = formValues

    const commonData = {
      ...restData,
      salesAgentId: finalAgentId,
      salesAgentSnapshot: finalAgentSnapshot,
    }

    setIsLoading(true)
    const toastId = toast.loading(
      isEditSplitMode
        ? 'Se regenerează grupul de facturi...'
        : 'Se generează facturile split...'
    )

    try {
      const result = await createSplitInvoices({
        commonData: commonData,
        originalItems: items,
        splitConfigs: configs,
      })

      if (result.success) {
        toast.success(result.message, { id: toastId })
        setShowSplitModal(false)
        router.push('/financial/invoices')
      } else {
        toast.error('Eroare:', { id: toastId, description: result.message })
      }
    } catch (error) {
      toast.error('Eroare neașteptată:', {
        id: toastId,
        description: (error as Error).message,
      })
    } finally {
      setIsLoading(false)
    }
  }
  const handleSplitButtonClick = async () => {
    if (isSplitGroupMember) {
      if (initialData?.splitGroupId) {
        setIsLoading(true)
        const result = await getSplitGroupPreview(
          initialData.splitGroupId.toString()
        )
        setIsLoading(false)

        if (result.success) {
          setGroupInvoicesList(result.data)
          setShowCancelAlert(true)
        } else {
          toast.error('Nu s-au putut încărca detaliile grupului.')
        }
      }
    } else {
      setShowSplitModal(true)
    }
  }
  const handleConfirmCancelSplit = async () => {
    if (!initialData?.splitGroupId) return
    setIsLoading(true)
    const toastId = toast.loading('Se anulează grupul de facturi...')

    try {
      const result = await cancelSplitGroup(initialData.splitGroupId.toString())
      if (result.success) {
        toast.success(result.message, { id: toastId })
        router.push('/financial/invoices')
      } else {
        toast.error(result.message, { id: toastId })
      }
    } catch (error) {
      toast.error('Eroare la anulare.', {
        id: toastId,
        description: (error as Error).message,
      })
    } finally {
      setIsLoading(false)
      setShowCancelAlert(false)
    }
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
            isVatDisabled={watchedVatCategory !== 'S'}
          />

          <div className='flex gap-2'>
            <Button type='submit' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Salvează Factura
            </Button>
            <Button
              className={`cursor-pointer h-9.5 ${isSplitGroupMember ? 'border-destructive text-destructive hover:bg-destructive/10' : ''}`}
              type='button'
              variant={isSplitGroupMember ? 'outline' : 'secondary'}
              onClick={handleSplitButtonClick}
              disabled={
                isLoading || (!isSplitGroupMember && watchedItems?.length === 0)
              }
              title={
                isSplitGroupMember
                  ? 'Anulează și regenerează split-ul'
                  : 'Împarte factura la mai mulți clienți'
              }
            >
              {isSplitGroupMember ? (
                <>
                  <Trash2 className='mr-2 h-4 w-4' />
                  Resetează Facturile Split (Anulează Tot)
                </>
              ) : (
                <>
                  <SplitIcon className='mr-2 h-4 w-4' />
                  Facturare Multiplă (Split)
                </>
              )}
            </Button>
          </div>
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
            alreadyLoadedNoteIds={loadedNotes.map((n) => n.id)}
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
            existingItems={watchedItems || []}
          />
        )}
      {showSplitModal && selectedClient && (
        <SplitInvoiceModal
          isOpen={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          onConfirm={handleSplitConfirm}
          originalClient={selectedClient}
          grandTotal={getValues('totals.grandTotal') || 0}
          currency={
            companySettings.bankAccounts.find((b) => b.isDefault)?.currency ||
            'RON'
          }
          originalItems={getValues('items') || []}
        />
      )}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Grup Facturi Split</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm text-muted-foreground'>
                <p className='mb-3'>
                  Această acțiune va anula <strong>toate facturile</strong> de
                  mai jos, asociate acestui split:
                </p>

                {/* LISTA FACTURILOR */}
                <div className='bg-muted/30 rounded-md border p-3 mb-4 space-y-2 max-h-[200px] overflow-y-auto'>
                  {groupInvoicesList.map((inv) => (
                    <div
                      key={inv.id}
                      className='flex justify-between items-center text-xs'
                    >
                      <div className='flex flex-col'>
                        <span className='font-semibold text-foreground'>
                          Factura #{inv.number} / {inv.date}
                        </span>
                        <span className='truncate max-w-[250px]'>
                          {inv.clientName}
                        </span>
                      </div>
                      <div className='font-mono font-medium'>
                        {formatCurrency(inv.total)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className='flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded border border-amber-200'>
                  <div className='mt-1.5'>
                    <Trash2 className='h-5 w-5' />
                  </div>
                  <p className='text-xs'>
                    Avizele și Livrările asociate vor reveni la starea{' '}
                    <strong>NEFACTURAT</strong> (Livrat) și vor putea fi
                    preluate pe o nouă factură.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelSplit}
              className='bg-primary hover:bg-destructive/90'
            >
              Da, Anulează Tot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  )
}
