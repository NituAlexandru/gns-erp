'use server'
import bcrypt from 'bcryptjs'
import { auth, signIn, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '../..'
import { formatError } from '../../../utils'
import User, { IUser } from './user.model'
import { PAGE_SIZE } from '../../../constants'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
// import { sendWelcomeEmail } from '@/emails'
import { sendWelcomeEmail } from '@/emails'
import {
  UserEmailUpdateSchema,
  UserPasswordUpdateSchema,
  UserPhoneUpdateSchema,
  UserSignUpSchema,
  UserUpdateSchema,
} from './validator'
import { IUserName, IUserSignIn, IUserSignUp } from './types'

export async function signInWithCredentials(user: IUserSignIn) {
  return await signIn('credentials', { ...user, redirect: false })
}
export const SignOut = async () => {
  const redirectTo = await signOut({ redirect: false })
  redirect(redirectTo.redirect)
}

export const SignInWithGoogle = async () => {
  await signIn('google')
}

// CREATE
export async function registerUser(userSignUp: IUserSignUp) {
  try {
    const user = await UserSignUpSchema.parseAsync({
      name: userSignUp.name,
      email: userSignUp.email,
      password: userSignUp.password,
      confirmPassword: userSignUp.confirmPassword,
    })

    await connectToDatabase()
    const createdUser = await User.create({
      ...user,
      password: await bcrypt.hash(user.password, 5),
    })

    // trimite-le doar un simplu "Bine ai venit!"
    await sendWelcomeEmail({
      _id: createdUser._id.toString(),
      name: createdUser.name,
      email: createdUser.email,
    })

    return { success: true, message: 'User created successfully' }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

// UPDATE
export async function updateUserName(user: IUserName) {
  try {
    await connectToDatabase()
    const session = await auth()
    const currentUser = await User.findById(session?.user?.id)
    if (!currentUser) throw new Error('User not found')
    currentUser.name = user.name
    const updatedUser = await currentUser.save()
    return {
      success: true,
      message: 'User updated successfully',
      data: JSON.parse(JSON.stringify(updatedUser)),
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// ─── 2) Schimbare EMAIL ───
export async function updateUserEmail(
  user: z.infer<typeof UserEmailUpdateSchema>
) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) throw new Error('Not authenticated')
    const currentUser = (await User.findById(session.user.id)) as IUser
    if (!currentUser) throw new Error('User not found')
    currentUser.email = user.email
    await currentUser.save()
    revalidatePath('/account/manage')
    return { success: true, message: 'Email updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// ─── 3) Schimbare PAROLĂ ───
export async function updateUserPassword(
  user: z.infer<typeof UserPasswordUpdateSchema>
) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) throw new Error('Not authenticated')
    const currentUser = (await User.findById(session.user.id)) as IUser
    if (!currentUser) throw new Error('User not found')
    currentUser.password = await bcrypt.hash(user.password, 5)
    await currentUser.save()
    revalidatePath('/account/manage')
    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// ─── 4) Schimbare TELEFON ───
export async function updateUserPhone(
  user: z.infer<typeof UserPhoneUpdateSchema>
) {
  try {
    await connectToDatabase()
    const session = await auth()
    if (!session) throw new Error('Not authenticated')
    const currentUser = (await User.findById(session.user.id)) as IUser
    if (!currentUser) throw new Error('User not found')
    currentUser.phone = user.phone
    await currentUser.save()
    revalidatePath('/account/manage')
    return { success: true, message: 'Phone updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// DELETE
export async function deleteUser(id: string) {
  try {
    await connectToDatabase()
    const res = await User.findByIdAndDelete(id)
    if (!res) throw new Error('Use not found')
    revalidatePath('/admin/users')
    return {
      success: true,
      message: 'User deleted successfully',
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// GET
export async function getAllUsers({
  limit,
  page,
}: {
  limit?: number
  page: number
}) {
  limit = limit || PAGE_SIZE
  await connectToDatabase()

  const skipAmount = (Number(page) - 1) * limit
  const users = await User.find()
    .sort({ createdAt: 'desc' })
    .skip(skipAmount)
    .limit(limit)
  const usersCount = await User.countDocuments()
  return {
    data: JSON.parse(JSON.stringify(users)) as IUser[],
    totalPages: Math.ceil(usersCount / limit),
  }
}
export async function updateUser(user: z.infer<typeof UserUpdateSchema>) {
  try {
    await connectToDatabase()
    const dbUser = await User.findById(user._id)
    if (!dbUser) throw new Error('User not found')
    dbUser.name = user.name
    dbUser.email = user.email
    dbUser.role = user.role
    const updatedUser = await dbUser.save()
    revalidatePath('/admin/users')
    return {
      success: true,
      message: 'User updated successfully',
      data: JSON.parse(JSON.stringify(updatedUser)),
    }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

export async function getUserById(userId: string) {
  await connectToDatabase()
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')
  return JSON.parse(JSON.stringify(user)) as IUser
}
