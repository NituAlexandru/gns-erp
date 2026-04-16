'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSignature, Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ContractTemplateDTO } from '@/lib/db/modules/contracts/contract.types'
import {
  generateAddendum,
  generateContract,
  getClientContracts,
  deleteContractDocument,
} from '@/lib/db/modules/contracts/contract-generate.actions'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { getPrintData } from '@/lib/db/modules/printing/printing.actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { useRouter } from 'next/navigation'

interface ContractActionsProps {
  clientId: string
  adminId: string
  hasActiveContract: boolean
  addendumTemplates: ContractTemplateDTO[]
}

export const ContractActions = ({
  clientId,
  adminId,
  hasActiveContract,
  addendumTemplates,
}: ContractActionsProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    addendumTemplates[0]?._id || '',
  )
  const [documents, setDocuments] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<PdfDocumentData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // --- STATE NOU PENTRU MODALUL DE ȘTERGERE ---
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    docId: string
    type: 'CONTRACT' | 'ADDENDUM' | null
  }>({ isOpen: false, docId: '', type: null })

  const [isDeleting, setIsDeleting] = useState(false) // Pentru spinner-ul de la ștergere
  const router = useRouter()

  const fetchDocs = useCallback(async () => {
    if (hasActiveContract) {
      const docs = await getClientContracts(clientId)
      setDocuments(docs)
    } else {
      setDocuments([])
    }
  }, [hasActiveContract, clientId])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleViewDocument = async (
    docId: string,
    type: 'CONTRACT' | 'ADDENDUM',
  ) => {
    setIsPreviewLoading(true)
    setIsPreviewOpen(true)

    const res = await getPrintData(docId, type)
    if (res.success) {
      setPreviewData(res.data)
    } else {
      toast.error(res.message)
      setIsPreviewOpen(false)
    }
    setIsPreviewLoading(false)
  }

  // --- LOGICA DE ȘTERGERE (ÎMPĂRȚITĂ ÎN 2 PAȘI) ---

  // Pasul 1: Deschide modalul
  const handleDeleteClick = (
    docId: string,
    type: 'CONTRACT' | 'ADDENDUM',
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation() // Prevenim deschiderea PDF-ului la click pe gunoi
    setDeleteConfirmation({ isOpen: true, docId, type })
  }

  // Pasul 2: Confirmarea efectivă (când apasă butonul roșu)
  const confirmDelete = async () => {
    const { docId, type } = deleteConfirmation
    if (!docId || !type) return

    setIsDeleting(true)
    const res = await deleteContractDocument(docId, clientId, type)

    if (res.success) {
      toast.success(res.message)
      await fetchDocs()
      router.refresh()
    } else {
      toast.error(res.message)
    }

    setIsDeleting(false)
    setDeleteConfirmation({ isOpen: false, docId: '', type: null }) // Închidem modalul
  }

  const handleGenerateContract = async () => {
    setIsGenerating(true)
    const res = await generateContract(clientId, adminId)

    if (res.success) {
      toast.success(res.message)
      await fetchDocs()
      router.refresh()
    } else {
      toast.error(res.message)
    }
    setIsGenerating(false)
  }

  const handleGenerateAddendum = async () => {
    if (!selectedTemplateId) {
      toast.error('Selectați un șablon de act adițional.')
      return
    }

    setIsGenerating(true)
    const res = await generateAddendum(clientId, selectedTemplateId, adminId)

    if (res.success) {
      toast.success(res.message)
      await fetchDocs()
      router.refresh()
      setIsModalOpen(false)
    } else {
      toast.error(res.message)
    }
    setIsGenerating(false)
  }

  return (
    <div className='flex items-center gap-2'>
      {/* 1. ZONA DOCUMENTELOR (Afișată dacă există contract/adiționale) */}
      {documents.length === 0 ? (
        <Button variant='outline' size='icon' disabled>
          <Printer className='w-4 h-4' />
        </Button>
      ) : documents.length === 1 ? (
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            className='cursor-pointer'
            size='icon'
            onClick={() =>
              handleViewDocument(documents[0]._id, documents[0].type)
            }
          >
            <Printer className='w-4 h-4' />
          </Button>
          {/* Buton Ștergere pt 1 singur document */}
          <Button
            variant='outline'
            className='cursor-pointer text-red-500 hover:text-red-700 hover:bg-red-50'
            size='icon'
            onClick={(e) =>
              handleDeleteClick(documents[0]._id, documents[0].type, e)
            }
          >
            <Trash2 className='w-4 h-4' />
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='icon'>
              <Printer className='w-4 h-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='min-w-[200px]'>
            {documents.map((doc) => (
              <DropdownMenuItem
                key={doc._id}
                onClick={() => handleViewDocument(doc._id, doc.type)}
                className='flex justify-between items-center cursor-pointer'
              >
                <span>
                  {doc.type === 'CONTRACT' ? 'Contract' : 'Act Adițional'}{' '}
                  {doc.number}
                </span>
                {/* Buton ștergere în interiorul dropdown-ului */}
                <div
                  className='p-1.5 hover:bg-red-100 rounded-md text-red-500 transition-colors'
                  onClick={(e) => handleDeleteClick(doc._id, doc.type, e)}
                >
                  <Trash2 className='w-4 h-4' />
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 2. BUTONUL DE GENERARE (Contract sau Adițional) */}
      {!hasActiveContract ? (
        <Button
          size='sm'
          onClick={handleGenerateContract}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          ) : (
            <FileSignature className='w-4 h-4 mr-2' />
          )}
          Crează Ctr.
        </Button>
      ) : (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size='sm' variant='secondary'>
              <Plus className='w-4 h-4 mr-2' />
              Adițional
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>Alege tipul de Act Adițional</DialogTitle>
            </DialogHeader>
            <div className='flex flex-col gap-3 py-4'>
              {addendumTemplates.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center'>
                  Nu există șabloane configurate.
                </p>
              ) : (
                addendumTemplates.map((t) => (
                  <Button
                    key={t._id}
                    variant={
                      selectedTemplateId === t._id ? 'default' : 'outline'
                    }
                    className='justify-start'
                    onClick={() => setSelectedTemplateId(t._id)}
                  >
                    <FileSignature className='w-4 h-4 mr-2' />
                    {t.name}
                  </Button>
                ))
              )}
            </div>
            <div className='flex justify-end pt-2 border-t'>
              <Button
                variant='ghost'
                onClick={() => setIsModalOpen(false)}
                className='mr-2'
              >
                Anulează
              </Button>
              <Button
                onClick={handleGenerateAddendum}
                disabled={isGenerating || addendumTemplates.length === 0}
              >
                {isGenerating && (
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                )}
                Confirmă
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. MODALUL DE PREVIZUALIZARE PDF */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={previewData}
        isLoading={isPreviewLoading}
      />

      {/* 4. NOU: MODALUL DE CONFIRMARE ȘTERGERE */}
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(isOpen) =>
          !isDeleting && setDeleteConfirmation((prev) => ({ ...prev, isOpen }))
        }
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle className='text-primary flex items-center gap-2'>
              <Trash2 className='w-5 h-5' />
              Confirmare Ștergere
            </DialogTitle>
          </DialogHeader>
          <div className='py-4 text-sm text-muted-foreground'>
            {deleteConfirmation.type === 'CONTRACT' ? (
              <p>
                Sigur doriți să ștergeți acest <strong>Contract</strong>?
                Această acțiune va șterge automat și <strong>TOATE</strong>{' '}
                actele adiționale asociate acestuia.
              </p>
            ) : (
              <p>
                Sigur doriți să ștergeți acest <strong>Act Adițional</strong>?
              </p>
            )}
            <p className='mt-2 font-semibold text-foreground'>
              Această acțiune este ireversibilă.
            </p>
          </div>
          <div className='flex justify-end pt-2 border-t mt-2'>
            <Button
              variant='ghost'
              onClick={() =>
                setDeleteConfirmation({ isOpen: false, docId: '', type: null })
              }
              className='mr-2'
              disabled={isDeleting}
            >
              Anulează
            </Button>
            <Button
              variant='default'
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              ) : null}
              Da, Șterge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
