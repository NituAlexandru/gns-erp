'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import ProductPreviewContent from '@/app/(root)/catalog-produse/details/product-preview-content'
import { toSlug } from '@/lib/utils'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import { useSession } from 'next-auth/react'

interface ProductHoverCardProps {
  id: string
  name: string
  productCode?: string
  children: React.ReactNode
  sideOffset?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
  avoidCollisions?: boolean
}

export function ProductHoverCard({
  id,
  name,
  productCode,
  children,
  sideOffset = 10,
  side = 'right',
  align = 'start',
  alignOffset = 0,
  avoidCollisions = true,
}: ProductHoverCardProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'user'
  const isAdminUser = SUPER_ADMIN_ROLES.map((r) => r.toLowerCase()).includes(
    userRole.toLowerCase(),
  )

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>

      <HoverCardContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={50}
        avoidCollisions={avoidCollisions}
        style={{ marginLeft: alignOffset ? `${alignOffset}px` : '0px' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className='z-[100] w-[calc(100vw-2rem)] max-w-[1100px] p-0 border-2 border-border shadow-2xl bg-background overflow-hidden text-left'
      >
        {/* Header Modal */}
        <div className='bg-muted/50 p-4 border-b flex justify-between items-center'>
          <span className='font-bold text-xs lg:text-sm uppercase truncate mr-4'>
            {name}
          </span>
          {productCode && (
            <Badge
              variant='outline'
              className='hidden sm:block font-mono text-[10px]'
            >
              {productCode}
            </Badge>
          )}
        </div>

        {/* Conținut Modal */}
        <div className='p-4 lg:p-6 max-h-[65vh] overflow-y-auto bg-background'>
          <ProductPreviewContent
            id={id}
            slug={toSlug(name)}
            isAdmin={isAdminUser}
          />
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
