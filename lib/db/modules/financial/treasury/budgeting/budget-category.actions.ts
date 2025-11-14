'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { formatError } from '@/lib/utils'
import { SUPER_ADMIN_ROLES } from '../../../user/user-roles'
import BudgetCategoryModel from './budget-category.model'
import {
  CreateBudgetCategoryInput,
  BudgetCategoryDTO,
} from './budget-category.types'
import {
  CreateBudgetCategorySchema,
  UpdateBudgetCategorySchema,
} from './budget-category.validator'
import { z } from 'zod'
import SupplierInvoiceModel from '../payables/supplier-invoice.model'

// --- Tipul de Răspuns ---
type CategoryActionResult = {
  success: boolean
  message: string
  data?: BudgetCategoryDTO | null
}

// --- Funcție ajutătoare pentru verificarea rolului de Admin ---
async function verifyAdmin() {
  const session = await auth()
  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  if (!isAdmin) {
    throw new Error(
      'Acces restricționat. Doar administratorii pot gestiona categoriile de buget.'
    )
  }
  return { userId: session!.user!.id!, userName: session!.user!.name! }
}

// --- CREATE ---
export async function createBudgetCategory(
  data: CreateBudgetCategoryInput
): Promise<CategoryActionResult> {
  try {
    const { userId, userName } = await verifyAdmin()
    await connectToDatabase()

    const validatedData = CreateBudgetCategorySchema.parse(data)

    const existing = await BudgetCategoryModel.findOne({
      name: validatedData.name,
      parentId: validatedData.parentId
        ? new Types.ObjectId(validatedData.parentId)
        : null,
    }).lean()

    if (existing) {
      throw new Error('O categorie cu acest nume există deja la acest nivel.')
    }

    const newCategory = new BudgetCategoryModel({
      ...validatedData,
      parentId: validatedData.parentId
        ? new Types.ObjectId(validatedData.parentId)
        : null,
      createdBy: new Types.ObjectId(userId),
      createdByName: userName,
    })

    await newCategory.save()
    revalidatePath('/incasari-si-plati/budgeting')

    return {
      success: true,
      message: 'Categoria a fost creată cu succes.',
      data: JSON.parse(JSON.stringify(newCategory)),
    }
  } catch (error) {
    console.error('❌ Eroare createBudgetCategory:', error)
    return { success: false, message: formatError(error) }
  }
}

// --- READ ---
export async function getBudgetCategories() {
  try {
    await connectToDatabase()

    const categories = await BudgetCategoryModel.find().sort({ name: 1 }).lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(categories)) as BudgetCategoryDTO[],
    }
  } catch (error) {
    console.error('❌ Eroare getBudgetCategories:', error)
    return { success: false, data: [] }
  }
}

// --- UPDATE ---
export async function updateBudgetCategory(
  data: z.infer<typeof UpdateBudgetCategorySchema>
): Promise<CategoryActionResult> {
  try {
    await verifyAdmin()
    await connectToDatabase()

    const validatedData = UpdateBudgetCategorySchema.parse(data)
    const { _id, ...updateData } = validatedData

    const category = await BudgetCategoryModel.findById(_id)
    if (!category) {
      throw new Error('Categoria nu a fost găsită.')
    }

    const existing = await BudgetCategoryModel.findOne({
      name: updateData.name,
      parentId: updateData.parentId
        ? new Types.ObjectId(updateData.parentId)
        : null,
      _id: { $ne: _id },
    }).lean()

    if (existing) {
      throw new Error(
        'O altă categorie cu acest nume există deja la acest nivel.'
      )
    }

    if (updateData.parentId && updateData.parentId === _id) {
      throw new Error('O categorie nu poate fi propria subcategorie.')
    }

    category.set({
      ...updateData,
      parentId: updateData.parentId
        ? new Types.ObjectId(updateData.parentId)
        : null,
    })

    await category.save()
    revalidatePath('/incasari-si-plati/budgeting')

    return {
      success: true,
      message: 'Categoria a fost actualizată.',
      data: JSON.parse(JSON.stringify(category)),
    }
  } catch (error) {
    console.error('❌ Eroare updateBudgetCategory:', error)
    return { success: false, message: formatError(error) }
  }
}

// --- DELETE ---
export async function deleteBudgetCategory(
  categoryId: string
): Promise<Omit<CategoryActionResult, 'data'>> {
  const session = await startSession()
  try {
    await verifyAdmin()

    let resultMessage = ''

    await session.withTransaction(async (session) => {
      const categoryIdObj = new Types.ObjectId(categoryId)

      const childCount = await BudgetCategoryModel.countDocuments({
        parentId: categoryIdObj,
      }).session(session)

      if (childCount > 0) {
        throw new Error(
          `Nu se poate șterge. Mutați sau ștergeți mai întâi cele ${childCount} subcategorii.`
        )
      }

      const result =
        await BudgetCategoryModel.findByIdAndDelete(categoryIdObj).session(
          session
        )

      if (!result) {
        throw new Error(
          'Categoria nu a fost găsită. Poate a fost ștearsă deja.'
        )
      }

      resultMessage = `Categoria "${result.name}" a fost ștearsă.`
    })

    await session.endSession()
    revalidatePath('/incasari-si-plati/budgeting')

    return { success: true, message: resultMessage }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare deleteBudgetCategory:', error)
    return { success: false, message: formatError(error) }
  }
}
export async function toggleBudgetCategoryStatus(
  categoryId: string,
  newStatus: boolean
): Promise<Omit<CategoryActionResult, 'data'>> {
  const session = await startSession()
  try {
    await verifyAdmin()
    let resultMessage = ''

    await session.withTransaction(async (session) => {
      const categoryIdObj = new Types.ObjectId(categoryId)

      // 1. Verificăm dacă încercăm să DEZACTIVĂM
      if (newStatus === false) {
        // 2. Verificăm dacă are copii ACTIVI
        const activeChildCount = await BudgetCategoryModel.countDocuments({
          parentId: categoryIdObj,
          isActive: true,
        }).session(session)

        if (activeChildCount > 0) {
          throw new Error(
            `Nu se poate dezactiva. Mutați sau dezactivați mai întâi cele ${activeChildCount} subcategorii active.`
          )
        }

        // 3. Verificăm dacă e folosită PE UNDEVA (aici e cheia)
        // (Momentan o verificăm doar pe facturi furnizor, dar va trebui să adaugi și alte locuri)
        const usageCount = await SupplierInvoiceModel.countDocuments({
          'items.budgetCategoryId': categoryIdObj,
        }).session(session)
      
        if (usageCount > 0) {
          throw new Error(
            `Nu se poate dezactiva. Categoria este deja folosită pe ${usageCount} documente.`
          )
        }
      }

      // 4. Dacă trecem de validări, actualizăm statusul
      const updatedCategory = await BudgetCategoryModel.findByIdAndUpdate(
        categoryIdObj,
        { $set: { isActive: newStatus } },
        { new: true, session }
      )

      if (!updatedCategory) {
        throw new Error('Categoria nu a fost găsită.')
      }

      resultMessage = `Categoria "${updatedCategory.name}" a fost ${newStatus ? 'reactivată' : 'dezactivată'}.`
    })

    await session.endSession()
    revalidatePath('/incasari-si-plati/budgeting')

    return { success: true, message: resultMessage }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    console.error('❌ Eroare toggleBudgetCategoryStatus:', error)
    return { success: false, message: (error as Error).message }
  }
}
