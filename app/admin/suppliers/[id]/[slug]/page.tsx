import SupplierView from './supplier-view'

// Pagina primește `params` ca o promisiune
export default function SupplierPage({
  params,
}: {
  // ✨ Tipul este acum Promise<{...}> ✨
  params: Promise<{ id: string; slug: string }>
}) {
  // Pasăm promisiunea mai departe componentei async
  return <SupplierView params={params} />
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
