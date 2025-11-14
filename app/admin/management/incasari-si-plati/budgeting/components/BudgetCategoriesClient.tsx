'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle, Edit, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // --- IMPORT NOU ---
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { deleteBudgetCategory } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'
import { BudgetCategoryForm } from './BudgetCategoryForm'
import { toast } from 'sonner'

interface BudgetCategoriesClientProps {
  allCategories: BudgetCategoryDTO[]
}

export function BudgetCategoriesClient({
  allCategories,
}: BudgetCategoriesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] =
    useState<BudgetCategoryDTO | null>(null)

  const categoryMap = new Map(allCategories.map((cat) => [cat._id, cat.name]))

  const handleEdit = (category: BudgetCategoryDTO) => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const onFormSubmit = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  const handleDelete = async (categoryId: string) => {
    try {
      const result = await deleteBudgetCategory(categoryId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error('Eroare la ștergere:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
  }

  return (
    <>
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
            allCategories={allCategories}
            currentCategory={editingCategory}
            onFormSubmit={onFormSubmit}
          />
        </DialogContent>
      </Dialog>

      <div className='flex justify-end'>
        <Button className='gap-2' onClick={handleAddNew}>
          <PlusCircle size={18} />
          Adaugă Categorie
        </Button>
      </div>

      {/* Tabelul cu Categorii */}
      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>Categorii Definite</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume Categorie</TableHead>
                <TableHead>Subcategorie a</TableHead>
                <TableHead>Descriere</TableHead>
                <TableHead className='text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCategories.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='text-center text-muted-foreground'
                  >
                    Nu există categorii definite.
                  </TableCell>
                </TableRow>
              )}
              {allCategories.map((cat) => (
                <TableRow key={cat._id}>
                  <TableCell className='font-medium'>{cat.name}</TableCell>
                  <TableCell>
                    {cat.parentId ? categoryMap.get(cat.parentId) : '—'}
                  </TableCell>
                  <TableCell>{cat.description || '—'}</TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleEdit(cat)}
                    >
                      <Edit className='h-4 w-4' />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='text-red-600 hover:text-red-700'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Confirmă Ștergerea
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Ești sigur că vrei să ștergi categoria {cat.name}?
                            Această acțiune este ireversibilă.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(cat._id)}
                            className='bg-red-600 hover:bg-red-700'
                          >
                            Șterge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
