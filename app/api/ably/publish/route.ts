import { NextResponse } from 'next/server'
import { getAblyRest } from '@/lib/db/modules/ably/ably-rest' // Folosim funcția fabrică, e corect

export async function POST(req: Request) {
  try {
    const ablyRest = getAblyRest() // Creează o instanță locală AICI
    const { channel, event, data } = await req.json()

    if (!channel || !event || !data) {
      return NextResponse.json(
        { success: false, error: 'Channel, event, and data are required.' },
        { status: 400 }
      )
    }

    const ablyChannel = ablyRest.channels.get(channel)
    await ablyChannel.publish(event, data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Ably publish API error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
