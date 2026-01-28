'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { SupplierInvoicesTable } from '../components/SupplierInvoicesTable'
import { SupplierInvoiceDetailSheet } from '../components/SupplierInvoiceDetailSheet'
import { CreateSupplierPaymentForm } from '../components/CreateSupplierPaymentForm'
import { CreateSupplierInvoiceForm } from '../components/CreateSupplierInvoiceForm'
import {
  deleteSupplierInvoice,
  getSupplierInvoiceById,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { AlertDialog } from '@radix-ui/react-alert-dialog'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface WrapperProps {
  initialData: any
  suppliers?: any[]
  budgetCategories?: any[]
  currentUser?: { id: string; name?: string | null }
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
}

export function SupplierInvoiceListWrapper({
  initialData,
  suppliers = [],
  budgetCategories = [],
  currentUser,
  vatRates,
  defaultVatRate,
}: WrapperProps) {
  const router = useRouter()
  const [invoiceToView, setInvoiceToView] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<
    string | undefined
  >(undefined)
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<
    string | undefined
  >(undefined)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingInvoiceData, setEditingInvoiceData] = useState<any>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const checkStatusGuard = (invoiceId: string, action: 'edit' | 'delete') => {
    const invoice = initialData.data.find((inv: any) => inv._id === invoiceId)

    if (
      invoice &&
      (invoice.status === 'PLATITA' || invoice.status === 'PARTIAL_PLATITA')
    ) {
      const actionText = action === 'edit' ? 'modifica' : 'șterge'
      toast.error(`Nu poți ${actionText} această factură!`, {
        description:
          'Factura are plăți înregistrate. Anulează plățile înainte de a continua.',
        duration: 5000,
      })
      return false // Oprește acțiunea
    }
    return true // Permite acțiunea
  }

  const handleDeleteClick = (invoiceId: string) => {
    if (!checkStatusGuard(invoiceId, 'delete')) return // Guard
    setInvoiceToDeleteId(invoiceId)
    setDeleteAlertOpen(true)
  }

  // 2. Confirm (Click pe "Sterge" din Modal -> Executa API)
  const confirmDelete = async () => {
    if (!invoiceToDeleteId) return
    setIsDeleting(true)
    try {
      const result = await deleteSupplierInvoice(invoiceToDeleteId)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare la ștergere:', { description: result.message })
      }
    } catch (error) {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setIsDeleting(false)
      setDeleteAlertOpen(false)
      setInvoiceToDeleteId(null)
    }
  }

  // --- Handlers Plati ---
  const handleOpenPayment = (supplierId: string, invoiceId?: string) => {
    setSelectedSupplierId(supplierId)
    setPreselectedInvoiceId(invoiceId)
    setPaymentModalOpen(true)
  }

  // --- Handlers EDIT ---
  const handleEdit = async (invoiceId: string) => {
    if (!checkStatusGuard(invoiceId, 'edit')) return

    setEditingInvoiceId(invoiceId)
    setIsLoadingEditData(true)
    setIsEditSheetOpen(true)
    setEditingInvoiceData(null)

    try {
      const result = await getSupplierInvoiceById(invoiceId)
      if (result.success && result.data) {
        setEditingInvoiceData(result.data)
      } else {
        toast.error('Nu s-au putut încărca datele facturii.', {
          description: result.message,
        })
        setIsEditSheetOpen(false)
      }
    } catch (error) {
      toast.error('Eroare la încărcarea facturii.')
      setIsEditSheetOpen(false)
    } finally {
      setIsLoadingEditData(false)
    }
  }

  const handleEditSuccess = () => {
    setIsEditSheetOpen(false)
    setEditingInvoiceId(null)
    setEditingInvoiceData(null)
    router.refresh()
  }

  return (
    <>
      <SupplierInvoicesTable
        data={initialData}
        onOpenDetailsSheet={setInvoiceToView}
        onOpenCreatePayment={handleOpenPayment}
        currentUser={currentUser}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Modal Detalii Factură */}
      <SupplierInvoiceDetailSheet
        invoiceId={invoiceToView}
        onClose={() => setInvoiceToView(null)}
      />

      {/* Modal Plată (Deschis din tabel) */}
      <Sheet open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <SheetContent
          side='right'
          className='w-[90%] md:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Înregistrare Plată</SheetTitle>
            <SheetDescription className='hidden'>
              Completează detaliile de mai jos pentru a efectua o plată.
            </SheetDescription>
          </SheetHeader>
          <div className='p-5'>
            <CreateSupplierPaymentForm
              initialSupplierId={selectedSupplierId}
              initialInvoiceId={preselectedInvoiceId}
              suppliers={suppliers}
              budgetCategories={budgetCategories}
              onFormSubmit={() => setPaymentModalOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* --- MODAL EDITARE FACTURA --- */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent
          side='right'
          className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Editare Factură Furnizor</SheetTitle>
            <SheetDescription>
              Modifică detaliile facturii. Doar facturile manuale pot fi
              editate.
            </SheetDescription>
          </SheetHeader>

          <div className='p-5'>
            {isLoadingEditData ? (
              <div className='flex items-center justify-center h-40'>
                <Loader2 className='h-8 w-8 animate-spin text-primary' />
              </div>
            ) : editingInvoiceData ? (
              <CreateSupplierInvoiceForm
                suppliers={suppliers}
                vatRates={vatRates}
                defaultVatRate={defaultVatRate}
                onFormSubmit={handleEditSuccess}
                initialData={editingInvoiceData} 
              />
            ) : (
              <p className='text-center text-muted-foreground'>
                Eroare la încărcare date.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Factura va fi ștearsă
              permanent, iar sumele furnizorului vor fi recalculate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Renunță</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
              className='bg-red-600 hover:bg-red-700'
            >
              {isDeleting ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              Șterge Factura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
