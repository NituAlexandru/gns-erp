import { redirect } from 'next/navigation'

export default function PayablesRootPage() {
  // Acest fișier nu mai încarcă date. Doar redirecționează către tab-ul implicit.
  redirect('/admin/management/incasari-si-plati/payables/facturi')
}
