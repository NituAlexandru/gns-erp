// import { VEHICLE_TYPE_NAMES } from './db/modules/fleet/vehicle/constants'
// import { VehicleType } from './db/modules/fleet/vehicle/types'

// export interface VehicleChoice {
//   vehicle: VehicleType
//   trips: number
// }
// /**
//  * Decide which vehicle is needed and how many trips are required to carry:
//  * - totalWeightKg  (sum of all item weights × qty)
//  * - totalVolumeM3  (sum of all item volumes × qty)
//  * - maxItemDims    (the single largest item's length/width/height)
//  *
//  * 1) Filter out any truck whose cargo‐bay
//  * dims < maxItemDims (it physically can’t load that item).
//  * 2) From the remainder, pick the smallest one that fits
//  * the entire load in one trip. If none, pick the largest.
//  * 3) Compute `trips = max(ceil(weight/capacity), ceil(volume/capacity))`
//  */
// export function allocateVehicleTrips(
//   totalWeightKg: number,
//   totalVolumeM3: number,
//   maxItemDims: { lengthCm: number; widthCm: number; heightCm: number }
// ): VehicleChoice {
//   const { lengthCm: maxL, widthCm: maxW, heightCm: maxH } = maxItemDims
//   const dimensionFit = VEHICLE_TYPE_NAMES.filter(
//     (v) => v.lengthCm >= maxL && v.widthCm >= maxW && v.heightCm >= maxH
//   )
//   if (dimensionFit.length === 0) {
//     throw new Error(
//       `Niciun vehicul nu poate încărca un produs de <span class="math-inline">\{maxL\}x</span>{maxW}x${maxH} cm`
//     )
//   }

//   const sorted = dimensionFit.sort((a, b) => a.maxLoadKg - b.maxLoadKg)

//   let chosen = sorted.find(
//     (v) => v.maxLoadKg >= totalWeightKg && v.maxVolumeM3 >= totalVolumeM3
//   )
//   if (!chosen) {
//     chosen = sorted[sorted.length - 1]
//   }

//   const trips = Math.max(
//     Math.ceil(totalWeightKg / chosen.maxLoadKg),
//     Math.ceil(totalVolumeM3 / chosen.maxVolumeM3)
//   )

//   return { vehicle: chosen, trips } // <--- Returnează vehiculul și numărul de curse
// }
