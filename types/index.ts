import { IProductInput } from '@/lib/db/modules/product/types'
import { ISettingInput } from '@/lib/db/modules/setting/types'
import { IUserInput } from '@/lib/db/modules/user/types'

export type Data = {
  settings: ISettingInput[]
  users: IUserInput[]
  products: IProductInput[]
  reviews: {
    title: string
    rating: number
    comment: string
  }[]
  headerMenus: {
    name: string
    href: string
  }[]
}

export interface PalletType {
  id: string // ID unic, ex: 'EURO-STD-WOOD'
  name: string // Nume afișat, ex: "Custodie Europalet Lemn Standard"
  slug: string // Pentru URL-uri sau referințe, ex: "custodie-europalet-lemn-standard"
  custodyFee: number // Taxa de custodie (prețul paletului)
  lengthCm: number
  widthCm: number
  heightCm: number // Înălțimea paletului GOL
  weightKg: number // Greutatea paletului GOL
  volumeM3: number // Volumul paletului GOL (specificat)
  image: string // Calea către imaginea statică a paletului
  supplier: string
  returnConditions?: string // Opțional
}

// Markup‐urile personalizate pentru un client
export interface ClientMarkup {
  clientId: string
  markups: {
    markupDirectDeliveryPrice?: number
    markupFullTruckPrice?: number
    markupSmallDeliveryBusinessPrice?: number
  }
}
