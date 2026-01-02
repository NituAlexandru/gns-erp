import { Types } from 'mongoose'
import { ReceiptStatusKey } from './receipt.constants' // <--- Importăm

export interface ReceiptAddress {
  judet?: string
  localitate?: string
  strada?: string
  numar?: string
  codPostal?: string
  alteDetalii?: string
  tara?: string
}

export interface ReceiptCompanySnapshot {
  name: string
  cui: string
  regCom?: string
  address: ReceiptAddress
}

export interface ReceiptClientSnapshot {
  name: string
  cui?: string
  address: ReceiptAddress
}

export interface ReceiptAllocationItem {
  invoiceId: string
  invoiceSeries: string
  invoiceNumber: string
  amountToPay: number
}
export interface ReceiptAllocationItem {
  invoiceId: string
  invoiceSeries: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number // Totalul facturii
  remainingAmount: number // Restul de plată înainte de această chitanță
  amountToPay: number // Cât plătim acum
}
export interface CreateReceiptDTO {
  seriesName?: string
  clientId: string
  clientName: string
  clientCui?: string
  clientAddress: ReceiptAddress
  representative: string
  explanation: string
  amount: number
  invoices?: string[]
  allocations?: ReceiptAllocationItem[]
}

export interface ReceiptDTO {
  _id: string
  series: string
  number: string
  date: string | Date
  companySnapshot: ReceiptCompanySnapshot
  clientSnapshot: ReceiptClientSnapshot
  representative: string
  explanation: string
  amount: number
  amountInWords: string
  currency: string
  invoices: string[]
  cashier: {
    userId: string
    name: string
  }
  status: ReceiptStatusKey
  cancellationReason?: string
  cancelledBy?: string
  cancelledByName?: string
  createdAt: string
  updatedAt: string
}
