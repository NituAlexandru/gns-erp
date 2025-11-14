'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Edit,
  Plus,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Eye,
} from 'lucide-react'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { CategoryTreeNode } from '../page'
import { toast } from 'sonner'
import { toggleBudgetCategoryStatus } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'

interface BudgetTreeItemProps {
  category: CategoryTreeNode
  allCategories: BudgetCategoryDTO[]
  onAddChild: (parentId: string) => void
  onEdit: (category: BudgetCategoryDTO) => void
}

export function BudgetTreeItem({
  category,
  allCategories,
  onAddChild,
  onEdit,
}: BudgetTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isParent = category.parentId === null

  const handleToggleActive = async () => {
    // Inversăm statusul
    const newStatus = !category.isActive
    try {
      // Apelăm noua acțiune
      const result = await toggleBudgetCategoryStatus(category._id, newStatus)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error('Eroare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
  }

  return (
    <div
      className={`relative ${!isParent ? 'ml-8' : ''} rounded-md bg-background`}
    >
      {/* Rândul categoriei */}
      <div className='flex items-center justify-between gap-2 rounded-md border p-2 pl-3 pr-2 shadow-sm'>
        <div className='flex items-center gap-2'>
          {/* Butonul de expandare (doar dacă e Părinte și are copii) */}
          {isParent && category.children.length > 0 && (
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
            </Button>
          )}
          {/* Indicator dacă e Părinte dar nu are copii */}
          {isParent && category.children.length === 0 && (
            <div className='w-6' /> // Doar pentru aliniere
          )}

          <span className={`font-medium ${isParent ? 'text-base' : 'text-sm'}`}>
            {category.name}
          </span>
          {category.description && (
            <span className='text-xs text-muted-foreground hidden md:block'>
              ({category.description})
            </span>
          )}
        </div>

        {/* Butoanele de Acțiune */}
        <div className='flex items-center'>
          {/* Buton "Adaugă Copil" (doar pe Părinți) */}
          {isParent && (
            <Button
              variant='ghost'
              size='icon'
              title='Adaugă subcategorie'
              className='h-7 w-7'
              onClick={() => onAddChild(category._id)}
            >
              <Plus className='h-4 w-4' />
            </Button>
          )}
          {/* Buton Editare */}
          <Button
            variant='ghost'
            size='icon'
            title='Modifică'
            className='h-7 w-7'
            onClick={() => onEdit(category)}
          >
            <Edit className='h-4 w-4' />
          </Button>
          {/* Buton Ștergere */}
          <Button
            variant='ghost'
            size='icon'
            title={category.isActive ? 'Dezactivează' : 'Reactivează'}
            className={`h-7 w-7 ${category.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
            onClick={handleToggleActive}
          >
            {category.isActive ? (
              <EyeOff className='h-4 w-4' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
          </Button>
          <span
            className={`font-medium ${isParent ? 'text-base' : 'text-sm'} ${!category.isActive && 'italic text-muted-foreground line-through'}`}
          >
            {category.name}
          </span>
        </div>
      </div>

      {/* Secțiunea de Copii (Recursiv) */}
      {isParent && isExpanded && category.children.length > 0 && (
        <div className='mt-2 space-y-2'>
          {category.children.map((childCategory) => (
            <BudgetTreeItem
              key={childCategory._id}
              category={childCategory}
              allCategories={allCategories}
              onAddChild={onAddChild}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
