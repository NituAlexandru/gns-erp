import { getBudgetCategories } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import { BudgetTreeClient } from './components/BudgetTreeClient'

export type CategoryTreeNode = BudgetCategoryDTO & {
  children: CategoryTreeNode[]
}

function buildCategoryTree(
  categories: BudgetCategoryDTO[],
  parentId: string | null = null
): CategoryTreeNode[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .map((category) => ({
      ...category,
      children: buildCategoryTree(categories, category._id),
    }))
}

export default async function BudgetingPage() {
  const categoriesResult = await getBudgetCategories()
  const flatCategories = categoriesResult.data || []

  // Construim arborele ierarhic pornind de la rădăcină (parentId: null)
  const categoryTree = buildCategoryTree(flatCategories, null)

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-2xl font-bold'>Categorii de Buget</h2>
        <p className='text-muted-foreground'>
          Gestionează ierarhia categoriilor și subcategoriilor de cheltuieli.
        </p>
      </div>

      {/* Trimitem la client și arborele (pt afișare) și lista plată (pt dropdown-uri) */}
      <BudgetTreeClient
        categoryTree={categoryTree}
        flatCategories={flatCategories}
      />
    </div>
  )
}
