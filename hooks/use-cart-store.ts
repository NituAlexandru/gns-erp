import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  ALLOWED_COUNTIES,
  AVAILABLE_DELIVERY_DATES,
  AVAILABLE_PALLET_TYPES,
  DEPOT_ADDRESS,
  NO_PALLET,
  VAT_RATE,
  VEHICLE_TYPES,
} from '@/lib/constants'
import { calculateFutureDate, normalizeStringForComparison } from '@/lib/utils'
import { getDistanceInKm } from '@/lib/maps'
import { allocateVehicleTrips, VehicleChoice } from '@/lib/vehicle'
import { getProductsDetailsForCart } from '@/lib/db/modules/product'
import { VehicleType } from '@/lib/db/modules/vehicle/types'
import { Cart, OrderItem, ShippingAddress } from '@/lib/db/modules/order/types'

interface CartVehicleAllocation {
  vehicle: VehicleType
  trips: number
  totalCost: number
}

const initialState: Cart = {
  items: [],
  itemsPrice: 0,
  taxPrice: undefined,
  shippingPrice: undefined,
  totalPrice: 0,
  //   paymentMethod: DEFAULT_PAYMENT_METHOD || '',
  shippingAddress: undefined,
  deliveryDateIndex: 0,
  shippingDistance: 0,
  vehicleAllocation: {
    vehicle: VEHICLE_TYPES[0],
    trips: 0,
    totalCost: 0,
  },
}

interface CartState {
  cart: Cart
  addItem: (item: OrderItem, quantity: number) => Promise<string>
  updateItem: (item: OrderItem, quantity: number) => Promise<void>
  removeItem: (item: OrderItem) => Promise<void>
  clearCart: () => void
  setShippingAddress: (shippingAddress: ShippingAddress) => Promise<void>
  setPaymentMethod: (paymentMethod: string) => void
  setDeliveryDateIndex: (index: number) => Promise<void>
  init: () => void
  recalculateCartTotals: () => Promise<void>
}
const round2 = (value: number): number => {
  if (isNaN(value) || !isFinite(value)) {
    return 0
  }
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const useCartStore = create(
  persist<CartState>(
    (set, get) => ({
      cart: initialState,
      recalculateCartTotals: async () => {
        // console.log(
        //   '[Cart DEBUG] recalculateCartTotals: Starting calculation...'
        // )
        // 0. Pregătim lista "rawItems" (doar produsele, fără paleti)
        const { shippingAddress, deliveryDateIndex } = get().cart
        const rawItems = get().cart.items.filter((i) => !i.isPalletItem)

        // 0a. Preluăm detalii produs pentru toate produsele (fără paleti)
        const productIds = rawItems.map((i) => i.product)
        const productsMap = await getProductsDetailsForCart(productIds)

        // 0b. Construim "allItems": produs + palet (dacă are palletTypeId și itemsPerPallet)
        const allItems: typeof rawItems = []
        rawItems.forEach((item) => {
          allItems.push(item)

          const prod = productsMap[item.product]
          // console.log('[Cart DEBUG] product from productsMap:', prod)

          // întâi, căutăm pallets by explicit palletTypeId
          // 1️⃣ dacă am un pallet explicit valid (și nu sentinel-ul), luăm ăla
          let pType: (typeof AVAILABLE_PALLET_TYPES)[0] | undefined
          if (
            prod.palletTypeId &&
            prod.palletTypeId !== NO_PALLET && // !!! skip sentinel
            AVAILABLE_PALLET_TYPES.some((p) => p.id === prod.palletTypeId)
          ) {
            pType = AVAILABLE_PALLET_TYPES.find(
              (p) => p.id === prod.palletTypeId
            )
          }

          // 2️⃣ fallback pe brand *numai dacă nu e deloc* palletTypeId (nu dacă e NO_PALLET)
          if (!pType && !prod.palletTypeId) {
            pType = AVAILABLE_PALLET_TYPES.find(
              (p) => p.supplier === prod.brand
            )
          }

          // console.log(
          //   `[Cart DEBUG] for "${prod.name}": itemsPerPallet=${prod.itemsPerPallet} palletTypeId="${prod.palletTypeId}" → pType=`,
          //   pType
          // )

          if (pType && prod.itemsPerPallet) {
            const perPallet = prod.itemsPerPallet
            const fullPalets = Math.floor(item.quantity / perPallet)
            const remainder = item.quantity % perPallet
            const threshold = perPallet * 0.25 // 25%

            // Număr de paleți = paleți complet încărcați
            // plus 1 dacă restul depășește 25% din perPallet
            const palletCount = fullPalets + (remainder >= threshold ? 1 : 0)

            if (palletCount > 0) {
              allItems.push({
                clientId: `pallet-${item.clientId}`,
                product: pType.id,
                name: pType.name,
                slug: `pallet-${pType.slug}`,
                category: 'Paleti',
                image: pType.image,
                quantity: palletCount,
                countInStock: palletCount,
                price: pType.custodyFee,
                weight: pType.weightKg,
                volume: pType.volumeM3,
                lengthCm: pType.lengthCm,
                widthCm: pType.widthCm,
                heightCm: pType.heightCm,
                isPalletItem: true,
                palletTypeId: pType.id,
                palletCount,
              })
            }
          }
        })

        // console.log('[Cart DEBUG] allItems after sync:', allItems)

        // 0c. Folosim "allItems" în tot calculul
        const items = allItems

        // -----------------------------------------------------------
        // 1. Calculează itemsPrice și rotunjește
        const newItemsPrice = round2(
          items.reduce((acc, item) => acc + item.price * item.quantity, 0)
        )

        // 2. Calculează valoarea TVA (taxPrice) inclusă în itemsPrice (pentru afișare) și rotunjește
        const newTaxRate = VAT_RATE
        let newTaxPrice: number | undefined = undefined
        if (items.length > 0 && newTaxRate > 0) {
          const calculatedTax = newItemsPrice * (newTaxRate / (1 + newTaxRate))
          newTaxPrice = round2(calculatedTax)
        } else {
          newTaxPrice = undefined
        }
        // Resetare variabile
        let newShippingPrice: number | undefined = undefined
        let newShippingDistance: number = 0
        let newVehicleAllocation: CartVehicleAllocation = {
          ...initialState.vehicleAllocation,
        }
        //  VARIABILA PENTRU DATĂ
        let newExpectedDeliveryDate: Date | undefined = undefined

        // 3. Calculează Transportul (dacă avem adresă și iteme)
        if (shippingAddress && items.length > 0) {
          try {
            // 3b′. Greutate totală (produse + paleti)
            const totalWeightKg = round2(
              items.reduce((sum, i) => sum + i.weight * i.quantity, 0)
            )

            // 3c′. Volum total (produse + paleti)
            const totalVolumeM3 = round2(
              items.reduce((sum, i) => sum + i.volume * i.quantity, 0)
            )

            // 3d′. Dimensiuni maxime (include paleti)
            const maxItemDims = items.reduce(
              (acc, i) => ({
                lengthCm: Math.max(acc.lengthCm, i.lengthCm),
                widthCm: Math.max(acc.widthCm, i.widthCm),
                heightCm: Math.max(acc.heightCm, i.heightCm),
              }),
              { lengthCm: 0, widthCm: 0, heightCm: 0 }
            )
            // console.log(
            //   `[Cart DEBUG] Aggregates calculated. MaxDims: <span class="math-inline">\{maxItemDims\.lengthCm\}x</span>{maxItemDims.widthCm}x${maxItemDims.heightCm}cm`
            // )

            // 3c. Calculează distanța
            const dest = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.postalCode}, ${shippingAddress.country}`
            try {
              newShippingDistance = round2(
                await getDistanceInKm(DEPOT_ADDRESS, dest)
              )
              if (isNaN(newShippingDistance)) newShippingDistance = 0
              // console.log(
              //   `[Cart DEBUG] Shipping Distance: ${newShippingDistance.toFixed(2)} km`
              // )
            } catch (distError) {
              console.error('[Cart DEBUG] Error getting distance:', distError)
              newShippingDistance = 0
            }

            // 3d. Alocă vehiculul
            let vehicleChoice: VehicleChoice | null = null
            if (
              totalWeightKg > 0 ||
              totalVolumeM3 > 0 ||
              maxItemDims.lengthCm > 0
            ) {
              try {
                vehicleChoice = allocateVehicleTrips(
                  totalWeightKg,
                  totalVolumeM3,
                  maxItemDims
                )
                // console.log('[Cart DEBUG] Vehicle allocated:', vehicleChoice)
              } catch (vehicleError) {
                console.error(
                  '[Cart DEBUG] Error allocating vehicle:',
                  vehicleError
                )
              }
            } else if (items.length > 0) {
              const courierVehicle =
                VEHICLE_TYPES.find((v) => v.name === 'Curier') ||
                VEHICLE_TYPES[0]
              vehicleChoice = { vehicle: courierVehicle, trips: 1 }
              // console.log('[Cart DEBUG] Assigned default courier.')
            }

            // 3e, 3f, 3g: Calculează costul final de transport (shippingPrice) ȘI data livrării
            let baseShippingFee = 0
            let applyFreeShipping = false
            let deliveryOption = null

            // Verificăm indexul datei de livrare selectat
            const isValidIndex =
              typeof deliveryDateIndex === 'number' &&
              deliveryDateIndex >= 0 &&
              deliveryDateIndex < AVAILABLE_DELIVERY_DATES.length

            if (isValidIndex) {
              deliveryOption = AVAILABLE_DELIVERY_DATES[deliveryDateIndex]
              baseShippingFee = deliveryOption.shippingPrice

              // --- CALCULUL DATEI ESTIMATE ---
              try {
                const daysToAdd = deliveryOption.daysToDeliver
                // console.log(
                //   `[Cart DEBUG] Calculating expectedDeliveryDate with daysToAdd: ${daysToAdd}`
                // )
                newExpectedDeliveryDate = calculateFutureDate(daysToAdd)
                // console.log(
                //   `[Cart DEBUG] Expected Delivery Date calculated:`,
                //   newExpectedDeliveryDate
                // )
              } catch (dateError) {
                console.error(
                  '[Cart DEBUG] Error calculating future date:',
                  dateError
                )
                newExpectedDeliveryDate = undefined
              }
              // --- SFÂRȘIT CALCUL DATĂ ---

              // doar pentru București & Ilfov
              if (
                deliveryOption.freeShippingMinPrice > 0 &&
                newItemsPrice >= deliveryOption.freeShippingMinPrice
              ) {
                // normalizăm oraș/provincie
                const cityNorm = normalizeStringForComparison(
                  shippingAddress!.city || ''
                )
                const provNorm = normalizeStringForComparison(
                  shippingAddress!.province || ''
                )
                // eligibil doar dacă e București sau Ilfov
                const isLocalEligible =
                  cityNorm === 'bucuresti' || provNorm === 'ilfov'
                applyFreeShipping = isLocalEligible
              }
              // console.log(
              //   `[Cart DEBUG] Delivery Option Base Fee: ${baseShippingFee}, Apply Free Shipping: ${applyFreeShipping}`
              // )
            } else {
              console.warn(
                '[Cart DEBUG] No valid delivery option selected. Cannot calculate date or fees.'
              )
              newExpectedDeliveryDate = undefined // Fără index valid -> fără dată
            }

            // Calculăm shippingPrice pe baza alocării vehiculului și a opțiunii
            if (vehicleChoice) {
              const detailedVehicleTransportCost = round2(
                vehicleChoice.trips *
                  newShippingDistance *
                  vehicleChoice.vehicle.ratePerKm *
                  2
              )
              newVehicleAllocation = {
                vehicle: vehicleChoice.vehicle,
                trips: vehicleChoice.trips,
                totalCost: detailedVehicleTransportCost,
              }

              // ——— LOCAL‐ONLY FREE SHIPPING (București & Ilfov) ———
              const cityNorm = normalizeStringForComparison(
                shippingAddress.city || ''
              )
              const provNorm = normalizeStringForComparison(
                shippingAddress.province || ''
              )
              const isLocalEligible =
                cityNorm === 'bucuresti' || provNorm === 'ilfov'

              if (
                deliveryOption &&
                isLocalEligible &&
                newItemsPrice >= deliveryOption.freeShippingMinPrice
              ) {
                // local + over threshold → free
                newShippingPrice = 0
              } else {
                // fallback to original logic
                newShippingPrice = applyFreeShipping
                  ? 0
                  : round2(newVehicleAllocation.totalCost + baseShippingFee)
              }
              // ————————————————————————————————————————————————
            } else {
              // Nu s-a alocat vehicul specific
              newVehicleAllocation = { ...initialState.vehicleAllocation } // Resetăm la default
              if (items.length > 0 && deliveryOption) {
                // Verificăm dacă avem opțiune validă
                if (applyFreeShipping) {
                  newShippingPrice = 0
                } else {
                  newShippingPrice = round2(baseShippingFee) // Doar taxa de bază
                }
              } else {
                newShippingPrice = undefined
              }
            }
          } catch (error) {
            console.error(
              '[Cart DEBUG] Error during shipping calculation part:',
              error
            )
            newShippingPrice = undefined
            newShippingDistance = 0
            newVehicleAllocation = { ...initialState.vehicleAllocation }
            newExpectedDeliveryDate = undefined // Resetăm și data la eroare
          }
        } else {
          // console.log(
          //   '[Cart DEBUG] No shipping address or cart empty, resetting shipping values.'
          // )
          newShippingPrice = undefined
          newShippingDistance = 0
          newVehicleAllocation = { ...initialState.vehicleAllocation }
          newExpectedDeliveryDate = undefined // Resetăm și data
        }

        // --- Pasul 4: Calculează totalPrice final ---
        const newTotalPrice = round2(
          newItemsPrice +
            (newShippingPrice !== undefined ? newShippingPrice : 0)
        )

        // --- Pasul 5: Actualizează starea completă ---
        // console.log('[Cart DEBUG] Updating store state with:', {
        //   newItemsPrice,
        //   newTaxPrice,
        //   newShippingPrice,
        //   newTotalPrice,
        //   newShippingDistance,
        //   newVehicleAllocation,
        //   newExpectedDeliveryDate,
        // })
        set({
          cart: {
            ...get().cart,
            items,
            itemsPrice: newItemsPrice,
            taxPrice: newTaxPrice,
            shippingPrice: newShippingPrice,
            totalPrice: newTotalPrice,
            shippingDistance: newShippingDistance,
            // vehicleAllocation: newVehicleAllocation,
            expectedDeliveryDate: newExpectedDeliveryDate,
          },
        })
        // console.log('[Cart DEBUG] recalculateCartTotals: Store state updated.')
      },

      addItem: async (item: OrderItem, quantity: number) => {
        // console.log(
        //   '[Cart DEBUG] addItem received item:',
        //   JSON.stringify(item, null, 2)
        // )
        // console.log('[Cart DEBUG] addItem received quantity:', quantity)

        // Preluăm itemele curente din store
        const currentItems = get().cart.items

        const existItem = currentItems.find(
          (x) =>
            x.product === item.product &&
            x.color === item.color &&
            x.size === item.size
        )

        // Verificare stoc
        const quantityNeeded = existItem
          ? existItem.quantity + quantity
          : quantity
        const stockAvailable = existItem
          ? existItem.countInStock
          : item.countInStock

        if (stockAvailable < quantityNeeded) {
          // Aruncăm eroarea pentru a fi prinsă în UI (de ex. într-un toast)
          throw new Error('Stoc insuficient pentru cantitatea dorită')
        }

        // Construim noua listă de iteme
        const updatedCartItems = existItem
          ? currentItems.map((x) =>
              x.product === item.product &&
              x.color === item.color &&
              x.size === item.size
                ? { ...existItem, quantity: existItem.quantity + quantity } // Actualizăm cantitatea itemului existent
                : x
            )
          : [...currentItems, { ...item, quantity }] // Adăugăm itemul nou cu cantitatea specificată

        // Pasul 1: Actualizăm DOAR lista de iteme în store.
        set((state) => ({
          cart: {
            ...state.cart,
            items: updatedCartItems,
          },
        }))
        // console.log(
        //   '[Cart DEBUG] addItem: Items updated in store. Current items:',
        //   updatedCartItems
        // )

        // Pasul 2: Apelăm funcția centrală pentru a recalcula TOATE totalurile,
        // console.log('[Cart DEBUG] addItem: Calling recalculateCartTotals...')
        await get().recalculateCartTotals()
        // console.log('[Cart DEBUG] addItem: recalculateCartTotals finished.')

        // Pasul 3: Găsim itemul în starea finală a coșului (după recalculare)
        const finalCartState = get().cart
        const foundItem = finalCartState.items.find(
          (x) =>
            x.product === item.product &&
            x.color === item.color &&
            x.size === item.size
        )

        if (!foundItem) {
          console.error(
            '[Cart DEBUG] addItem: Product not found in cart after add and recalculate. This is unexpected.'
          )
          throw new Error(
            'Produsul nu a fost găsit în coș după adăugare și recalculare.'
          )
        }

        // console.log(
        //   '[Cart DEBUG] addItem: Successfully added/updated item. Returning clientId:',
        //   foundItem.clientId
        // )
        return foundItem.clientId || '' // Returnează clientId-ul itemului (nou sau existent)
      },

      updateItem: async (item: OrderItem, quantity: number) => {
        console.log(
          '[Cart DEBUG] updateItem received item:',
          JSON.stringify(item, null, 2),
          'quantity:',
          quantity
        )

        // Preluăm itemele curente din store
        const currentItems = get().cart.items

        const exist = currentItems.find(
          (x) =>
            x.product === item.product &&
            x.color === item.color &&
            x.size === item.size
        )

        if (!exist) {
          console.warn(
            '[Cart DEBUG] updateItem: Item not found in cart. Aborting update.',
            item
          )
          return // Itemul nu a fost găsit, nu putem actualiza
        }

        // Verificare stoc la update
        if (exist.countInStock < quantity) {
          // Aruncăm eroarea pentru a fi prinsă în UI
          throw new Error('Stoc insuficient pentru cantitatea dorită')
        }

        // Construim noua listă de iteme cu cantitatea actualizată
        const updatedCartItems = currentItems.map((x) =>
          x.product === item.product &&
          x.color === item.color &&
          x.size === item.size
            ? { ...exist, quantity: quantity }
            : x
        )

        // Pasul 1: Actualizăm DOAR lista de iteme în store.
        set((state) => ({
          cart: {
            ...state.cart,
            items: updatedCartItems,
          },
        }))
        // console.log(
        //   '[Cart DEBUG] updateItem: Items updated in store. Current items:',
        //   updatedCartItems
        // )

        // Pasul 2: Apelăm funcția centrală pentru a recalcula TOATE totalurile.
        // console.log('[Cart DEBUG] updateItem: Calling recalculateCartTotals...')
        await get().recalculateCartTotals()
        // console.log(
        //   '[Cart DEBUG] updateItem: recalculateCartTotals finished. Cart state:',
        //   get().cart
        // )
      },

      removeItem: async (item: OrderItem) => {
        // console.log(
        //   '[Cart DEBUG] removeItem received item:',
        //   JSON.stringify(item, null, 2)
        // )

        // Preluăm itemele curente din store
        const currentItems = get().cart.items

        // Filtrăm itemul care trebuie eliminat pentru a obține noua listă
        const updatedCartItems = currentItems.filter(
          (x) =>
            !(
              // Condiția de eliminare: itemul NU este cel specificat
              (
                x.product === item.product &&
                x.color === item.color &&
                x.size === item.size
              )
            )
        )

        // Verificăm dacă s-a eliminat ceva
        if (currentItems.length === updatedCartItems.length) {
          console.warn(
            '[Cart DEBUG] removeItem: Item not found or filter condition failed. No item removed.',
            item
          )
        }

        // Pasul 1: Actualizăm DOAR lista de iteme în store.
        set((state) => ({
          cart: {
            ...state.cart,
            items: updatedCartItems,
          },
        }))
        // console.log(
        //   '[Cart DEBUG] removeItem: Items updated in store. Current items:',
        //   updatedCartItems
        // )

        // Pasul 2: Apelăm funcția centrală pentru a recalcula TOATE totalurile.
        // console.log('[Cart DEBUG] removeItem: Calling recalculateCartTotals...')
        await get().recalculateCartTotals()
        // console.log(
        //   '[Cart DEBUG] removeItem: recalculateCartTotals finished. Cart state:',
        //   get().cart
        // )
      },

      setShippingAddress: async (
        shippingAddressData: ShippingAddress
      ): Promise<void> => {
        // console.log(
        //   '[Cart DEBUG] setShippingAddress called with:',
        //   shippingAddressData
        // )

        // --- VERIFICARE JUDEȚ ---
        const raw = shippingAddressData.province?.trim() || ''
        const userCounty =
          raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()

        // Verificarea dacă provincia a fost introdusă (folosind 'raw')
        if (!raw) {
          console.warn(
            '[Cart DEBUG] setShippingAddress: County (province) is missing from shipping address.'
          )
          throw new Error('Județul lipsește din adresa de livrare.')
        }
        // Normalizăm inputul utilizatorului (din 'raw') PENTRU a fi folosit ÎN COMPARAȚIE
        const normalizedUserRawInputForComparison =
          normalizeStringForComparison(raw)

        const isAllowed = ALLOWED_COUNTIES.some((allowedCountyFromList) => {
          // Normalizăm fiecare element din lista permisă PENTRU COMPARAȚIE
          const normalizedAllowedCounty = normalizeStringForComparison(
            allowedCountyFromList
          )
          // Comparam formele normalizate
          return normalizedAllowedCounty === normalizedUserRawInputForComparison
        })
        // --- SFÂRȘITUL MODIFICĂRII STRICTE PENTRU COMPARAȚIE ---

        if (!isAllowed) {
          console.warn(
            `[Cart DEBUG] setShippingAddress: Shipping to county "${userCounty}" (raw: "${raw}", normalized for check: "${normalizedUserRawInputForComparison}") is not allowed by default.`
          )
          // Aruncă eroarea specifică pentru a fi prinsă în UI, folosind 'userCounty'
          throw new Error(
            `Livrarea în județul ${userCounty} nu se face standard. Pentru ofertă personalizată, accesați:` // Mesajul specific
          )
        }
        // console.log( // Păstrăm comentariul tău
        //   `[Cart DEBUG] setShippingAddress: County "${userCounty}" is allowed. Proceeding...`
        // );
        // --- SFÂRȘIT VERIFICARE JUDEȚ ---

        // Restul funcției rămâne exact cum l-ai furnizat:
        set((state) => ({
          cart: {
            ...state.cart,
            shippingAddress: shippingAddressData,
          },
        }))
        // console.log(
        //   '[Cart DEBUG] setShippingAddress: shippingAddress updated in store.'
        // );

        await get().recalculateCartTotals()
        // console.log(
        //   '[Cart DEBUG] setShippingAddress: recalculateCartTotals finished. Cart state:',
        //   get().cart
        // );
      },

      // Golește complet coșul
      clearCart: () => {
        set({ cart: initialState })
        // console.log('Cart cleared')
      },

      // Setează metoda de plată aleasă
      setPaymentMethod: (paymentMethod: string) => {
        set((state) => ({
          cart: {
            ...state.cart,
            paymentMethod: paymentMethod,
          },
        }))
      },

      // Setează indexul datei de livrare alese și recalculează prețurile/datele
      setDeliveryDateIndex: async (index: number) => {
        // console.log(
        //   `[Cart DEBUG] setDeliveryDateIndex: Setting delivery date index to: ${index}`
        // )

        // Pasul 1: Actualizăm DOAR indexul pentru data de livrare în store.
        set((state) => ({
          cart: {
            ...state.cart,
            deliveryDateIndex: index, // Setează noul index
          },
        }))
        // console.log(
        //   '[Cart DEBUG] setDeliveryDateIndex: deliveryDateIndex updated in store.'
        // )

        // Pasul 2: Apelăm funcția centrală pentru a recalcula TOATE totalurile.
        // console.log(
        //   '[Cart DEBUG] setDeliveryDateIndex: Calling recalculateCartTotals...'
        // )
        await get().recalculateCartTotals()
        // console.log(
        //   '[Cart DEBUG] setDeliveryDateIndex: recalculateCartTotals finished. Cart state:',
        //   get().cart
        // )
      },
      init: async () => {
        // console.log('[Cart DEBUG] init: Cart store initialized/rehydrated.')

        // Comentariile tale originale sunt foarte relevante aici:
        // "Adauga logica care trebuie să ruleze la încărcarea store-ului,
        // de exemplu, să verifici dacă produsele din coș mai sunt valide/în stoc."
        // Aceasta ar implica de obicei:
        // 1. Preluarea itemelor din 'get().cart.items'.
        // 2. Pentru fiecare item, poate verificarea cu un API dacă prețul/stocul s-a schimbat.
        // 3. Actualizarea itemelor în store dacă este necesar, înainte de recalculare.
        // console.log(
        //   '[Cart DEBUG] init: Forcing recalculation of cart totals...'
        // )
        try {
          await get().recalculateCartTotals()
          // console.log(
          //   '[Cart DEBUG] init: recalculateCartTotals completed. Final cart state after init:',
          //   get().cart
          // )
        } catch (error) {
          console.error(
            '[Cart DEBUG] init: Error during recalculateCartTotals in init:',
            error
          )
        }
      },
    }), // <-- Sfârșitul obiectului returnat de (set, get) => ({...})
    {
      name: 'cart-store', // Numele folosit pentru persistență (în localStorage)
    }
  ) // <-- Sfârșitul persist
) // <-- Sfârșitul create

export default useCartStore
