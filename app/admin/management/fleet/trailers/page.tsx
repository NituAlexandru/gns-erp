import { getAllTrailers } from '@/lib/db/modules/fleet/trailers/trailers.actions'
import TrailersList from './trailers-list'

export default async function TrailersPage() {
  const trailers = await getAllTrailers()
  return <TrailersList initialTrailers={trailers} />
}
