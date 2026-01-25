// 'use client'

// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { formatCurrency } from '@/lib/utils'
// import { ISupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.model'
// import { useState } from 'react'
// import { getPrintData } from '@/lib/db/modules/printing/printing.actions'
// import { toast } from 'sonner'
// import { Printer } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { SupplierLedgerTemplate } from '@/components/printing/templates/SupplierLedgerTemplate'
// import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'

// interface SupplierSummaryCardProps {
//   summary: ISupplierSummary
// }

// export default function SupplierSummaryCard({
//   summary,
// }: SupplierSummaryCardProps) {
//   const debt = summary.outstandingBalance
//   const isDebt = debt > 0
//   const soldTitle = isDebt ? 'Sold Datorat' : 'Sold Creditor (Avans)'
//   const soldColor = isDebt ? 'text-red-600' : 'text-green-600'
//   const overdue = summary.overdueBalance
//   const hasOverdue = overdue > 0
//   const [isPdfOpen, setIsPdfOpen] = useState(false)
//   const [pdfData, setPdfData] = useState<PdfDocumentData | null>(null)
//   const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

// const handlePrintLedger = async () => {
//   setIsGeneratingPdf(true)
//   setIsPdfOpen(true) // Deschidem modalul imediat cu loading state

//   try {
//     // Extragem ID-ul sigur
//     const id =
//       typeof summary.supplierId === 'object'
//         ? (summary.supplierId as any).toString()
//         : summary.supplierId

//     const result = await getPrintData(id, 'SUPPLIER_LEDGER')

//     if (result.success) {
//       setPdfData(result.data)
//     } else {
//       toast.error('Eroare', { description: result.message })
//       setIsPdfOpen(false)
//     }
//   } catch (e) {
//     toast.error('Eroare server la generarea PDF')
//     setIsPdfOpen(false)
//   } finally {
//     setIsGeneratingPdf(false)
//   }
// }

//   return (
//     <div className='p-4 rounded-lg border'>
//       <h2 className='text-lg font-semibold mb-4'>Sumar Financiar Furnizor</h2>

//       <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
//         {/* 1. Sold Curent */}
//         <Card>
//           <CardHeader>
//             <div className='flex items-center gap-2'>
//               <CardTitle className='text-sm font-medium'>{soldTitle}</CardTitle>
//               <Button
//                 variant='ghost'
//                 size='icon'
//                 className='h-6 w-6'
//                 onClick={handlePrint}
//                 disabled={loading}
//                 title='Printează Fișa'
//               >
//                 <Printer
//                   className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
//                 />
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className={`text-2xl font-bold ${soldColor}`}>
//               {formatCurrency(debt)}
//             </div>
//             <p className='text-xs text-muted-foreground mt-1'>
//               {isDebt ? 'Total de plată către furnizor' : 'Am plătit în plus'}
//             </p>
//           </CardContent>
//         </Card>

//         {/* 2. Scadent Depășit */}
//         <Card>
//           <CardHeader>
//             <CardTitle className='text-sm font-medium'>Sold Scadent</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div
//               className={`text-2xl font-bold ${hasOverdue ? 'text-red-600' : 'text-gray-900'}`}
//             >
//               {formatCurrency(overdue)}
//             </div>
//             <p className='text-xs text-muted-foreground mt-1'>
//               Facturi cu termen depășit
//             </p>
//           </CardContent>
//         </Card>

//         {/* 3. Total Achiziții (Informativ) */}
//         <Card>
//           <CardHeader>
//             <CardTitle className='text-sm font-medium'>
//               Total Achiziții
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className='text-2xl font-bold text-blue-600'>
//               {formatCurrency(summary.totalPurchaseValue)}
//             </div>
//             <p className='text-xs text-muted-foreground mt-1'>
//               Valoarea istorică a comenzilor
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }
