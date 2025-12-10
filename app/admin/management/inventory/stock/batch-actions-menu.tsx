'use client'

import { useState } from 'react'
import {
  MoreHorizontal,
  Pencil,
  ArrowRightLeft,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PopulatedBatch } from '@/lib/db/modules/inventory/types'
import { AdjustStockDialog } from './adjust-stock-dialog'
import { TransferStockDialog } from './transfer-stock-dialog'
import { BatchEditDialog } from '@/components/inventory/batch-edit-dialog'

interface BatchActionsMenuProps {
  inventoryItemId: string
  batch: PopulatedBatch
  stockableItemName: string
  unit: string
  locationName: string
}

export function BatchActionsMenu({
  inventoryItemId,
  batch,
  stockableItemName,
  unit,
  locationName,
}: BatchActionsMenuProps) {
  const [showAdjustDialog, setShowAdjustDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Deschide meniu</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className=' bg-secondary text-popover-foreground border border-border shadow-md p-1'
        >
          <DropdownMenuLabel className='hidden'>Acțiuni Lot</DropdownMenuLabel>

          <DropdownMenuItem
            className='cursor-pointer hover:bg-accent-foreground hover:text-accent focus:bg-accent focus:text-accent-foreground'
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className='mr-2 h-4 w-4' />
            Declaratie Conformitate
          </DropdownMenuItem>

          <DropdownMenuItem
            className='cursor-pointer hover:bg-accent-foreground hover:text-accent focus:bg-accent focus:text-accent-foreground'
            onClick={() => setShowTransferDialog(true)}
          >
            <ArrowRightLeft className='mr-2 h-4 w-4' />
            Transferă
          </DropdownMenuItem>

          <DropdownMenuItem
            className='cursor-pointer hover:bg-accent-foreground hover:text-accent focus:bg-accent focus:text-accent-foreground'
            onClick={() => setShowAdjustDialog(true)}
          >
            <Scale className='mr-2 h-4 w-4' />
            Ajustează (+/-)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DIALOGURI */}

      {showAdjustDialog && (
        <AdjustStockDialog
          open={showAdjustDialog}
          onOpenChange={setShowAdjustDialog}
          inventoryItemId={inventoryItemId}
          currentUnitCost={batch.unitCost}
          batchId={batch._id?.toString()}
          currentQuantity={batch.quantity}
          stockableItemName={stockableItemName}
          unit={unit}
        />
      )}

      {showTransferDialog && (
        <TransferStockDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          inventoryItemId={inventoryItemId}
          batchId={batch._id?.toString() || ''}
          sourceLocation={locationName}
          currentQuantity={batch.quantity}
          stockableItemName={stockableItemName}
          unit={unit}
        />
      )}

      {showEditDialog && (
        <BatchEditDialog
          batch={batch} 
          inventoryItemId={inventoryItemId}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  )
}
