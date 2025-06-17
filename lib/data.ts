import { Data, IProductInput } from '@/types'

const products: IProductInput[] = []

const data: Data = {
  products,
  headerMenus: [
    {
      name: 'Cere Ofertă Personalizată',
      href: '/page/oferta-personalizata',
    },
    {
      name: 'Oferte',
      href: '/search?tag=todays-deal',
    },
    {
      name: 'Noutăți',
      href: '/search?tag=new-arrival',
    },
    {
      name: 'Recomandări',
      href: '/search?tag=featured',
    },
    {
      name: 'Cele mai Vândute',
      href: '/search?tag=best-seller',
    },
    {
      name: 'Suport Clienți',
      href: '/page/suport-clienti',
    },
    {
      name: 'Despre Noi',
      href: '/page/despre-noi',
    },
    {
      name: 'Ajutor',
      href: '/page/ajutor',
    },
  ],
}

export default data
