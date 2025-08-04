'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import type { ReceptionFilters } from '@/lib/db/modules/reception/types'
import { PAGE_SIZE } from '@/lib/constants'

interface Props {
  initial?: Partial<ReceptionFilters>
  onChange: (filters: ReceptionFilters) => void
}

export function SearchFilters({ initial = {}, onChange }: Props) {
  const [q, setQ] = useState(initial.q ?? '')
  const [status, setStatus] = useState(initial.status ?? 'ALL')
  const [createdBy, setCreatedBy] = useState(initial.createdBy ?? 'ALL')
  const [users, setUsers] = useState<{ _id: string; name: string }[]>([])

  useEffect(() => {
    setQ(initial.q ?? '')
    setStatus(initial.status ?? 'ALL')
    setCreatedBy(initial.createdBy ?? 'ALL')
  }, [initial.q, initial.status, initial.createdBy])

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setUsers(list)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    onChange({
      q,
      status,
      createdBy,
      page: 1,
      pageSize: initial.pageSize ?? PAGE_SIZE,
    })
  }, [q, status, createdBy, onChange, initial.pageSize])

  return (
    <div className='flex flex-wrap gap-4'>
      {/* Free-text search */}
      <div className='flex-1 min-w-[300px]'>
        <Input
          aria-label='Caută după furnizor, dată, aviz, factură, total'
          placeholder='Furnizor, dată, aviz, factură, total'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Status dropdown */}
      <div className='min-w-[160px]'>
        <Select value={status} onValueChange={(v) => setStatus(v)}>
          <SelectTrigger aria-label='Filtrează după status' className='w-full'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate stările</SelectItem>
            <SelectItem value='DRAFT'>Draft</SelectItem>
            <SelectItem value='CONFIRMAT'>Confirmat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Created by dropdown */}
      <div className='min-w-[160px]'>
        <Select value={createdBy} onValueChange={(v) => setCreatedBy(v)}>
          <SelectTrigger
            aria-label='Filtrează după utilizator'
            className='w-full'
          >
            <SelectValue placeholder='Creat de' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Oricine</SelectItem>
            {users.map((u) => (
              <SelectItem key={u._id} value={u._id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
