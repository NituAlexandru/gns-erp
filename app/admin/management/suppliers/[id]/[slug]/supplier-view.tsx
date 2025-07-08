import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { getSupplierById } from '@/lib/db/modules/suppliers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/auth'
import { chunkString, toSlug } from '@/lib/utils'
import SeparatorWithOr from '@/components/shared/separator-or'
import { Barcode } from '@/components/barcode/barcode-image'

export default async function SupplierView({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  await auth()

  const { id, slug } = await params

  const supplier = await getSupplierById(id)

  if (!supplier) {
    notFound()
  }

  const canonical = toSlug(supplier.name)
  if (slug !== canonical) {
    return redirect(`/admin/management/suppliers/${id}/${canonical}`)
  }

  return (
    <div>
      <div className='flex items-center justify-between gap-4 mr-20 px-6'>
        <div className='flex items-center gap-4 mb-5'>
          <Button asChild variant='outline'>
            <Link href='/admin/management/suppliers'>
              <ChevronLeft /> Înapoi
            </Link>
          </Button>{' '}
          <h1 className='text-2xl font-bold'>
            Detalii furnizor {supplier.name}
          </h1>
        </div>
        <div className='my-2'>
          <Barcode
            text={supplier.fiscalCode}
            type='code128'
            width={300}
            height={100}
          />
        </div>
      </div>
      <div className='p-6 pt-0'>
        <div className=' flex gap-3'>
          {/* Informații Generale */}
          <div className='w-1/3'>
            <p>
              <strong>ID:</strong> {supplier._id}
            </p>

            <p>
              <strong>Nume Furnizor:</strong> {supplier.name}
            </p>
            {supplier.contactName && (
              <p>
                <strong>Persoană Contact:</strong> {supplier.contactName}
              </p>
            )}
            <p>
              <strong>Email:</strong> {supplier.email}
            </p>
            <p>
              <strong>Telefon:</strong> {supplier.phone}
            </p>
            {supplier.brand && supplier.brand.length > 0 && (
              <p>
                <strong>Branduri:</strong> {supplier.brand.join(', ')}
              </p>
            )}
          </div>
          {/* Informații Bancare */}
          <div className='w-1/3'>
            {' '}
            {supplier.externalTransport && (
              <p className='font-semibold text-green-500'>
                ✔ Transport asigurat de furnizor
              </p>
            )}
            {/* Informații Transport */}
            <p>
              <strong>Costuri transport intern:</strong>{' '}
              {supplier.internalTransportCosts} LEI
            </p>
            <p>
              <strong>Costuri transport extern:</strong>{' '}
              {supplier.externalTransportCosts} LEI
            </p>{' '}
            {supplier.bankAccountLei && (
              <p>
                <strong>Cont LEI:</strong>{' '}
                {chunkString(supplier.bankAccountLei, 4)}
              </p>
            )}
            {supplier.bankAccountEuro && (
              <p>
                <strong>Cont EURO:</strong>{' '}
                {chunkString(supplier.bankAccountEuro, 4)}
              </p>
            )}
          </div>
          {/* Informații Fiscale și de Adresă */}
          <div className='w-1/3'>
            {' '}
            {supplier.isVatPayer && (
              <p className='font-semibold text-green-600'>✔ Plătitor de TVA</p>
            )}
            <p>
              <strong>Adresă fiscală:</strong> {supplier.address}
            </p>
            <p>
              <strong>Cod Fiscal:</strong> {supplier.fiscalCode}
            </p>
            <p>
              <strong>Nr. Registru Comerț:</strong> {supplier.regComNumber}
            </p>
            {/* Afișăm adresele de încărcare dacă există */}
            {supplier.loadingAddress && supplier.loadingAddress.length > 0 && (
              <>
                <strong>Adrese de încărcare:</strong>
                <ul className='list-disc list-inside pl-4'>
                  {supplier.loadingAddress.map((addr, index) => (
                    <li
                      className='w-full italic font-light text-justify'
                      key={index}
                    >
                      {addr}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        {/* Branduri și Mențiuni */}
        <div className='w-full flex'>
          {supplier.mentions && (
            <p className='w-2/3'>
              <strong>Mențiuni:</strong>{' '}
              <span className='w-full italic text-muted-foreground font-light text-justify'>
                {supplier.mentions}
              </span>{' '}
            </p>
          )}
        </div>

        {/* Timestamps */}
        <div className='mb-0 text-sm text-muted-foreground space-y-1 flex flex-row gap-20 justify-end'>
          <p>
            <strong>Creat la:</strong>{' '}
            {new Date(supplier.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Actualizat la:</strong>{' '}
            {new Date(supplier.updatedAt).toLocaleString()}
          </p>
        </div>
        <SeparatorWithOr> </SeparatorWithOr>
      </div>
    </div>
  )
}
// Pentru statistica - de adaugat dupa finalizarea modului de statistica

// const PurchaseOrderSchema = new Schema(
//   {
//     supplier: {
//       type: mongoose.Types.ObjectId,
//       ref: 'Supplier',
//       required: true,
//     },
//     date: { type: Date, default: Date.now },
//     items: [
//       {
//         material: {
//           type: mongoose.Types.ObjectId,
//           ref: 'Material',
//           required: true,
//         },
//         qty: Number,
//         unitPrice: Number,
//         lineTotal: Number, // qty * unitPrice
//       },
//     ],
//     status: {
//       type: String,
//       enum: ['Pending', 'Received', 'Cancelled'],
//       default: 'Pending',
//     },
//     // eventual alte câmpuri: termeni plată, condiții transport…
//   },
//   { timestamps: true }
// )
// const GoodsReceiptSchema = new Schema(
//   {
//     supplier: {
//       type: mongoose.Types.ObjectId,
//       ref: 'Supplier',
//       required: true,
//     },
//     purchaseOrder: { type: mongoose.Types.ObjectId, ref: 'PurchaseOrder' },
//     date: { type: Date, default: Date.now },
//     items: [
//       {
//         material: {
//           type: mongoose.Types.ObjectId,
//           ref: 'Material',
//           required: true,
//         },
//         qty: Number,
//         // eventual unitPrice dacă vrei să salvezi prețul de recepție
//       },
//     ],
//   },
//   { timestamps: true }
// )
// import mongoose from 'mongoose'

// // Exemplu de agregare Mongoose în serviciul tău:
// export async function getSupplierStats(supplierId: string) {
//   const id = new mongoose.Types.ObjectId(supplierId)

//   // 1) număr comenzi
//   // 2) sumă totală comandă
//   // 3) număr recepții
//   // 4) sumă total recepționată
//   const stats = await PurchaseOrder.aggregate([
//     { $match: { supplier: id } },
//     {
//       $facet: {
//         orders: [
//           {
//             $group: {
//               _id: null,
//               count: { $sum: 1 },
//               totalOrdered: { $sum: '$items.lineTotal' },
//             },
//           },
//         ],
//         receipts: [
//           {
//             $match: {
//               /* eventual filtrare după purchaseOrder */
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               totalReceived: { $sum: '$items.qty' },
//             },
//           },
//         ],
//       },
//     },
//     // proiectează default-urile dacă nu-s date
//     {
//       $project: {
//         ordersCount: { $ifNull: [{ $arrayElemAt: ['$orders.count', 0] }, 0] },
//         totalOrdered: {
//           $ifNull: [{ $arrayElemAt: ['$orders.totalOrdered', 0] }, 0],
//         },
//         totalReceived: {
//           $ifNull: [{ $arrayElemAt: ['$receipts.totalReceived', 0] }, 0],
//         },
//       },
//     },
//   ])

//   return (
//     stats[0] || {
//       ordersCount: 0,
//       totalOrdered: 0,
//       totalReceived: 0,
//     }
//   )
// }
// export default async function SupplierPage({ params }) {
//   const { id, slug } = await params
//   const supplier = await getSupplierById(id)
//   if (!supplier) notFound()

//   const { ordersCount, totalOrdered, totalReceived } =
//     await getSupplierStats(id)
//   const balance = totalOrdered - totalReceived

//   return (
//     <div className='p-6'>
//       <h1 className='text-2xl font-bold'>{supplier.name}</h1>
//       <div className='mt-4 space-y-1'>
//         <p>
//           Comenzi plasate: <strong>{ordersCount}</strong>
//         </p>
//         <p>
//           Valoare totală comandă: <strong>{totalOrdered.toFixed(2)} Lei</strong>
//         </p>
//         <p>
//           Total recepționat: <strong>{totalReceived}</strong> buc.
//         </p>
//         <p>
//           Sold restant (cantitate): <strong>{balance}</strong> buc.
//         </p>
//       </div>
//       {/* restul detaliilor */}
//     </div>
//   )
// }
