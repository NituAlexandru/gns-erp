'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  Save,
  FileText,
  FilePlus2,
} from 'lucide-react'
import { saveContractTemplate } from '@/lib/db/modules/contracts/contract-template.actions'
import { toast } from 'sonner'
import {
  ContractTemplateDTO,
  IContractParagraph,
} from '@/lib/db/modules/contracts/contract.types'

const dummyData = {
  nume_client: '[Nume Client]',
  cui_client: '[CUI Client]',
  adresa_client: '[Adresă Client]',
  nume_companie: 'GENESIS MARKETING & DISTRIBUTION',
  data_contract: '[Data Generării]',
  termen_plata: '30',
  plafon_credit: '15.000',
  persoana_contact_principal: 'Administrator Nume',
  telefon_contact_principal: '0700 000 000',
  lista_persoane_receptie:
    '\n- Fuiorea Andreea – telefon 0748405917\n- Druna Bogdan Marius – telefon 0732.552.624',
}

export const ContractTemplateBuilder = ({
  initialTemplates,
}: {
  initialTemplates: ContractTemplateDTO[]
}) => {
  const [templates, setTemplates] =
    useState<ContractTemplateDTO[]>(initialTemplates)
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    initialTemplates[0]?._id || '',
  )

  const activeTemplate = templates.find((t) => t._id === activeTemplateId)

  const [paragraphs, setParagraphs] = useState<IContractParagraph[]>(
    activeTemplate
      ? [...activeTemplate.paragraphs].sort((a, b) => a.order - b.order)
      : [],
  )
  const [isSaving, setIsSaving] = useState(false)

  // Schimbarea șablonului activ din Tab-uri
  const handleSelectTemplate = (id: string) => {
    const template = templates.find((t) => t._id === id)
    if (template) {
      setActiveTemplateId(id)
      setParagraphs([...template.paragraphs].sort((a, b) => a.order - b.order))
    }
  }

  // Crearea unui șablon nou temporar în interfață (se salvează efectiv când apeși Salvează)
  const handleCreateNewTemplate = (type: 'CONTRACT' | 'ADDENDUM') => {
    const newId = `temp_${Date.now()}`
    const newTemplate: ContractTemplateDTO = {
      _id: newId,
      name: type === 'CONTRACT' ? 'Contract Nou' : 'Act Adițional Nou',
      documentTitle:
        type === 'CONTRACT' ? 'CONTRACT DE VÂNZARE-CUMPĂRARE' : 'ACT ADIȚIONAL',
      type: type,
      isDefault: false,
      paragraphs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTemplates([...templates, newTemplate])
    setActiveTemplateId(newId)
    setParagraphs([])
  }

  const handleAddParagraph = () => {
    const newPara: IContractParagraph = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      content: '',
      order: paragraphs.length + 1,
    }
    setParagraphs([...paragraphs, newPara])
  }

  const handleUpdate = (
    id: string,
    field: keyof IContractParagraph,
    value: string,
  ) => {
    setParagraphs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    )
  }

  const handleUpdateTemplateName = (newName: string) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t._id === activeTemplateId ? { ...t, name: newName } : t,
      ),
    )
  }
  const handleUpdateDocumentTitle = (newTitle: string) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t._id === activeTemplateId ? { ...t, documentTitle: newTitle } : t,
      ),
    )
  }
  const handleDelete = (id: string) => {
    setParagraphs((prev) => {
      const filtered = prev.filter((p) => p.id !== id)
      return filtered.map((p, idx) => ({ ...p, order: idx + 1 }))
    })
  }

  const moveParagraph = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === paragraphs.length - 1) return

    const newParagraphs = [...paragraphs]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    const temp = newParagraphs[index]
    newParagraphs[index] = newParagraphs[targetIndex]
    newParagraphs[targetIndex] = temp

    setParagraphs(newParagraphs.map((p, idx) => ({ ...p, order: idx + 1 })))
  }

  const handleSave = async () => {
    if (!activeTemplate) return
    setIsSaving(true)

    const res = await saveContractTemplate(activeTemplate._id, {
      name: activeTemplate.name,
      documentTitle: activeTemplate.documentTitle,
      type: activeTemplate.type,
      paragraphs: paragraphs,
    })

    if (res.success) {
      toast.success('Salvat cu succes!')
    } else {
      toast.error('Eroare la salvare')
    }
    setIsSaving(false)
  }

  const renderPreviewContent = (text: string) => {
    let previewText = text
    Object.entries(dummyData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      previewText = previewText.replace(regex, value)
    })
    return previewText
  }

  if (!activeTemplate) return <div>Nu există șabloane.</div>

  return (
    <div className='flex flex-col gap-4 w-full h-[calc(100vh-100px)]'>
      {/* TOP: SELECTOR TAB-URI */}
      <div className='flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-lg border'>
        {templates.map((t) => (
          <Button
            key={t._id}
            variant={t._id === activeTemplateId ? 'default' : 'outline'}
            onClick={() => handleSelectTemplate(t._id)}
            size='sm'
          >
            <FileText className='w-4 h-4 mr-2' />
            {t.name}
          </Button>
        ))}
        <div className='flex-1'></div>
        <Button
          variant='secondary'
          size='sm'
          onClick={() => handleCreateNewTemplate('CONTRACT')}
        >
          <FilePlus2 className='w-4 h-4 mr-2' /> Contract Nou
        </Button>
        <Button
          variant='secondary'
          size='sm'
          onClick={() => handleCreateNewTemplate('ADDENDUM')}
        >
          <FilePlus2 className='w-4 h-4 mr-2' /> Act Adițional Nou
        </Button>
      </div>

      <div className='flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden'>
        {/* LEFT: EDITOR */}
        <div className='flex-1 flex flex-col gap-4 border-r pr-6 overflow-y-auto relative'>
          <div className='flex flex-col gap-2 sticky top-0 bg-background z-20 pt-2 pb-4 border-b'>
            <div className='flex justify-between items-center'>
              <div className='flex-1 mr-4'>
                <Input
                  value={activeTemplate.name}
                  onChange={(e) => handleUpdateTemplateName(e.target.value)}
                  className='text-lg font-bold h-10'
                  placeholder='Numele Șablonului'
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className='w-4 h-4 mr-2' />
                {isSaving ? 'Se salvează...' : 'Salvează Șablon'}
              </Button>
            </div>

            {/* --- INPUT NOU PENTRU TITLUL PRINTAT --- */}
            <div className='mt-2 mb-2'>
              <label className='text-xs font-bold text-muted-foreground uppercase'>
                Titlul Printat (Apare pe PDF):
              </label>
              <Input
                value={activeTemplate.documentTitle || ''}
                onChange={(e) => handleUpdateDocumentTitle(e.target.value)}
                className='mt-1 font-bold'
                placeholder='Ex: CONTRACT DE PRESTĂRI SERVICII'
              />
            </div>
            <div className='bg-muted p-2 rounded border text-xs text-muted-foreground'>
              <span className='font-bold'>
                Variabile opționale (se înlocuiesc automat):
              </span>{' '}
              {Object.keys(dummyData)
                .map((k) => `{{${k}}}`)
                .join(', ')}
            </div>
          </div>

          <div className='space-y-4'>
            {paragraphs.map((para, index) => (
              <div
                key={para.id}
                className='border rounded-md p-4 bg-card text-card-foreground shadow-sm flex gap-4'
              >
                <div className='flex flex-col gap-1 border-r pr-2 items-center justify-center'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => moveParagraph(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className='w-4 h-4' />
                  </Button>
                  <span className='text-xs font-bold text-muted-foreground'>
                    {para.order}
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => moveParagraph(index, 'down')}
                    disabled={index === paragraphs.length - 1}
                  >
                    <ArrowDown className='w-4 h-4' />
                  </Button>
                </div>

                <div className='flex-1 flex flex-col gap-2'>
                  <Input
                    value={para.title || ''}
                    onChange={(e) =>
                      handleUpdate(para.id, 'title', e.target.value)
                    }
                    className='font-bold'
                    placeholder='Titlu Paragraf (Opțional. Lăsați gol pentru text simplu)'
                  />
                  <Textarea
                    value={para.content}
                    onChange={(e) =>
                      handleUpdate(para.id, 'content', e.target.value)
                    }
                    className='min-h-[100px] text-sm'
                    placeholder='Conținutul paragrafului...'
                  />
                </div>

                <div>
                  <Button
                    variant='destructive'
                    size='icon'
                    onClick={() => handleDelete(para.id)}
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant='outline'
            className='w-full border-dashed mb-10'
            onClick={handleAddParagraph}
          >
            <PlusCircle className='w-4 h-4 mr-2' /> Adaugă Paragraf Nou
          </Button>
        </div>

        {/* RIGHT: LIVE PREVIEW */}
        <div className='flex-1 bg-muted/30 rounded-lg p-6 overflow-y-auto'>
          <h3 className='text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider'>
            Live Preview (A4)
          </h3>
          <div className='bg-background shadow-lg border w-full min-h-[800px] p-8 text-sm leading-relaxed text-foreground'>
            <h1 className='text-center font-bold text-lg mb-6 uppercase'>
              {activeTemplate.documentTitle ||
                (activeTemplate.type === 'CONTRACT'
                  ? 'Contract de Vânzare-Cumpărare'
                  : 'Act Adițional')}
            </h1>

            {/* ANTETUL FIX - GENERAT DE SISTEM */}
            <div className='border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 mb-6 rounded-md'>
              <p className='text-xs font-bold text-slate-400 mb-2 uppercase'>
                [Zonă generată automat de sistem - Nu necesită editare]
              </p>
              <p className='font-bold'>Între:</p>
              <p>
                1.{' '}
                <span className='font-bold'>
                  GENESIS MARKETING & DISTRIBUTION
                </span>
                , cu sediul în..., CUI..., reprezentată prin...
              </p>
              <p className='mt-2 font-bold'>Și</p>
              <p>
                2.{' '}
                <span className='font-bold'>
                  [DATE CLIENT PRELUATE DIN ERP]
                </span>
                , cu sediul în..., CUI..., reprezentată prin...
              </p>
              <p className='mt-2'>
                S-a încheiat prezentul{' '}
                {activeTemplate.type === 'CONTRACT'
                  ? 'contract'
                  : 'act adițional'}
                .
              </p>
            </div>

            {paragraphs.map((para) => (
              <div key={para.id} className='mb-4'>
                {para.title && para.title.trim() !== '' && (
                  <h4 className='font-bold mb-1'>{para.title}</h4>
                )}
                <p className='whitespace-pre-wrap'>
                  {renderPreviewContent(para.content)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
