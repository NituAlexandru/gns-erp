import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import UserModel from '@/lib/db/modules/user/user.model'

export async function GET() {
  await connectToDatabase()

  const users = await UserModel.find(
    {
      role: { $in: ['Admin', 'Manager', 'Administrator'] },
    },
    'name'
  ).lean()

  return NextResponse.json(users.map((u) => ({ _id: u._id, name: u.name })))
}
