'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  InvoiceLineInput,
  StornableProductDTO,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { getStornableProductsList } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { cn, round2 } from '@/lib/utils'

// --- Hook-ul pentru Debounce ---
// (Am adăugat acest hook mic direct aici pentru simplitate)
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    // Anulează timer-ul dacă valoarea se schimbă (ex: utilizatorul încă tastează)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}
// --- Sfârșit Hook ---

interface SelectStornoProductModalProps {
  clientId: string
  addressId: string
  onClose: () => void
  onConfirm: (productId: string, quantityToStorno: number) => void
  existingItems: InvoiceLineInput[]
}

export function SelectStornoProductModal({
  clientId,
  addressId,
  onClose,
  onConfirm,
  existingItems,
}: SelectStornoProductModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<StornableProductDTO[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] =
    useState<StornableProductDTO | null>(null)
  const [quantity, setQuantity] = useState(0)

  // Folosim hook-ul de debounce. Căutarea va porni la 500ms DUPĂ ce user-ul s-a oprit din tastat
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const getRealAvailableQuantity = (prod: StornableProductDTO) => {
    const alreadyAddedQty = existingItems
      .filter((item) => item.productId === prod.productId)
      .reduce((acc, item) => acc + Math.abs(item.quantity), 0)

    return Math.max(0, round2(prod.totalRemainingToStorno - alreadyAddedQty))
  }

  // 1. Logica de căutare (se activează când 'debouncedSearchTerm' se schimbă)
  useEffect(() => {
    const handleSearch = async () => {
      if (debouncedSearchTerm.length < 3) {
        setProducts([]) // Golește lista dacă e prea scurt
        return
      }

      setIsLoading(true)
      setSelectedProduct(null) // Resetează selecția
      setQuantity(0)

      const result = await getStornableProductsList(
        clientId,
        addressId,
        debouncedSearchTerm
      )

      if (result.success) {
        setProducts(result.data)
        if (result.data.length === 0) {
          toast.warning('Niciun produs eligibil nu a fost găsit.', {
            description: 'Asigurați-vă că facturile sursă sunt APROBATE.',
          })
        }
      } else {
        toast.error('Eroare la căutarea produselor', {
          description: result.message,
        })
      }
      setIsLoading(false)
    }

    handleSearch()
  }, [debouncedSearchTerm, clientId, addressId]) // <-- Se re-rulează doar la termenul "debounced"

  // 2. Handler pentru selectarea unui produs
  const handleProductSelect = (product: StornableProductDTO) => {
    setSelectedProduct(product)
    setQuantity(0) // Resetează cantitatea la selectare
  }

  // 3. Handler pentru confirmare
  const handleConfirmClick = () => {
    if (!selectedProduct || quantity <= 0) return
    // Validare pe cantitatea reală
    if (quantity > currentAvailableQty) {
      toast.error('Cantitate invalidă', {
        description: `Nu puteți stornare mai mult decât cantitatea disponibilă (${currentAvailableQty}).`,
      })
      return
    }
    onConfirm(selectedProduct.productId, quantity)
  }

  const currentAvailableQty = selectedProduct
    ? getRealAvailableQuantity(selectedProduct)
    : 0

  // 4. Validare pentru butonul de confirmare
  const isConfirmDisabled =
    isLoading ||
    !selectedProduct ||
    quantity <= 0 ||
    quantity > currentAvailableQty

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className='sm:max-w-3xl min-h-[400px]'>
        <DialogHeader>
          <DialogTitle>Selectează Produs pentru Stornare </DialogTitle>
          <DialogDescription>
            Tastați numele produsului (min. 3 caractere) și așteptați
            rezultatele.
          </DialogDescription>
        </DialogHeader>

        <div className='flex gap-4'>
          {/* Coloana 1: Lista de Produse */}
          <div className='flex-1 space-y-2'>
            <div className='relative'>
              <Input
                placeholder='🔍 Tastați numele produsului...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pr-10'
              />
              {isLoading && (
                <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
                  <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                </div>
              )}
            </div>

            {/* AICI ESTE SCROLLBAR-UL (max-h-400px) */}
            <div className='max-h-[400px] overflow-y-auto space-y-2 rounded-md border p-2'>
              {!isLoading && products.length === 0 && (
                <p className='p-8 text-center text-muted-foreground'>
                  {searchTerm.length < 3
                    ? 'Introduceți cel puțin 3 caractere pentru a căuta.'
                    : 'Niciun produs nu corespunde căutării. Asigurați-vă că facturile sursă sunt APROBATE.'}
                </p>
              )}

              {!isLoading &&
                products.map((prod) => {
                  const isSelected =
                    selectedProduct?.productId === prod.productId

                  const realQty = getRealAvailableQuantity(prod)
                  const isFullyUsed = realQty <= 0
                  return (
                    <div
                      key={prod.productId}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm',
                        isSelected && 'border-primary ring-1 ring-primary',
                        isFullyUsed && 'opacity-50 cursor-not-allowed bg-muted'
                      )}
                      onClick={() => !isFullyUsed && handleProductSelect(prod)}
                    >
                      <div className='font-medium'>{prod.productName}</div>
                      <div className='text-right text-muted-foreground'>
                        {isFullyUsed ? (
                          <span className='text-xs font-bold text-destructive'>
                            SELECTAT TOTAL
                          </span>
                        ) : (
                          <>
                            <span className='font-semibold text-primary'>
                              {realQty} {/* <-- Afișează cantitatea reală */}
                            </span>{' '}
                            {prod.unitOfMeasure}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Coloana 2: Detalii și Cantitate */}
          <div className='w-1/3 space-y-4 rounded-md border bg-muted/30 p-4'>
            {selectedProduct ? (
              <>
                <h4 className='font-semibold'>Cantitate de Stornat</h4>
                <p className='text-sm font-medium text-primary'>
                  {selectedProduct.productName}
                </p>
                <p className='text-sm text-muted-foreground'>
                  Disponibil:{' '}
                  <strong className='text-foreground'>
                    {currentAvailableQty} {selectedProduct.unitOfMeasure}{' '}
                  </strong>
                </p>

                <Input
                  type='number'
                  placeholder='Introdu cantitatea...'
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  max={currentAvailableQty}
                  min={0}
                  className='text-lg'
                />

                {quantity > currentAvailableQty && (
                  <p className='text-xs text-destructive'>
                    Cantitate prea mare! Maxim: {currentAvailableQty}
                  </p>
                )}
              </>
            ) : (
              <div className='flex h-full items-center justify-center'>
                <p className='text-center text-muted-foreground'>
                  {products.length > 0
                    ? 'Selectează un produs din listă.'
                    : 'Căutați un produs pentru a începe.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='ghost' onClick={onClose}>
            Anulează
          </Button>
          <Button
            type='button'
            onClick={handleConfirmClick}
            disabled={isConfirmDisabled}
          >
            Adauga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
