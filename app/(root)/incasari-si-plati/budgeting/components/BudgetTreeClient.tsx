'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { BudgetCategoryForm } from './BudgetCategoryForm'
import { CategoryTreeNode } from '../page'
import { BudgetTreeItem } from './BudgetTreeItem'

interface BudgetTreeClientProps {
  categoryTree: CategoryTreeNode[]
  flatCategories: BudgetCategoryDTO[]
}

export function BudgetTreeClient({
  categoryTree,
  flatCategories,
}: BudgetTreeClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Starea pentru editare
  const [editingCategory, setEditingCategory] =
    useState<BudgetCategoryDTO | null>(null)

  // Starea pentru creare (reținem părintele)
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null)

  // Deschide modalul pentru a crea o categorie RĂDĂCINĂ
  const handleAddNewRoot = () => {
    setEditingCategory(null)
    setDefaultParentId(null) 
    setIsModalOpen(true)
  }

  // Deschide modalul pentru a crea un COPIL
  const handleAddNewChild = (parentId: string) => {
    setEditingCategory(null)
    setDefaultParentId(parentId) // Setăm părintele
    setIsModalOpen(true)
  }

  // Deschide modalul pentru a EDITA
  const handleEdit = (category: BudgetCategoryDTO) => {
    setEditingCategory(category)
    setDefaultParentId(null) // Nu e relevant la editare
    setIsModalOpen(true)
  }

  const onFormSubmit = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setDefaultParentId(null)
  }

  return (
    <>
      {/* Modalul de Adăugare/Editare */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifică Categorie' : 'Categorie Nouă'}
            </DialogTitle>
            <DialogDescription>
              Completează detaliile categoriei de buget.
            </DialogDescription>
          </DialogHeader>
          <BudgetCategoryForm
            allCategories={flatCategories}
            currentCategory={editingCategory}
            defaultParentId={defaultParentId}
            onFormSubmit={onFormSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Butonul principal de adăugare */}
      <div className='flex justify-end'>
        <Button className='gap-2' onClick={handleAddNewRoot}>
          <PlusCircle size={18} />
          Adaugă Categorie Principală
        </Button>
      </div>

      {/* --- ARBORELE --- */}
      <div className='rounded-lg border p-4 space-y-2'>
        {categoryTree.length === 0 ? (
          <p className='text-center text-sm text-muted-foreground py-4'>
            Nu există categorii definite.
          </p>
        ) : (
          categoryTree.map((rootCategory) => (
            <BudgetTreeItem
              key={rootCategory._id}
              category={rootCategory}
              allCategories={flatCategories}
              onAddChild={handleAddNewChild}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>
    </>
  )
}
