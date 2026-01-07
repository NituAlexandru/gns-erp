import { MongoDBAdapter } from '@auth/mongodb-adapter'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import CredentialsProvider from 'next-auth/providers/credentials'
import { connectToDatabase } from './lib/db'
import client from './lib/db/client'
import User, { IUser } from './lib/db/modules/user/user.model'
import NextAuth, { type DefaultSession } from 'next-auth'
import authConfig from './auth.config'

declare module 'next-auth' {
  interface Session {
    user: {
      role: string
      phone?: string
      active?: boolean
    } & DefaultSession['user']
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/sign-in',
    newUser: '/sign-up',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60,
  },
  adapter: MongoDBAdapter(client),
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      credentials: {
        email: {
          type: 'email',
        },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        await connectToDatabase()
        if (credentials == null) return null

        const user = await User.findOne({ email: credentials.email })

        if (user && user.password) {
          const isMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          )
          if (isMatch) {
            return {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          }
        }
        return null
      },
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      // Permitem logarea doar dacă utilizatorul există deja în DB
      await connectToDatabase()
      const existingUser = await User.findOne({ email: user.email })

      if (!existingUser) {
        // Returnând false, Auth.js va redirecționa către pagina de eroare/login
        return false
      }
      return true
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        await connectToDatabase()
        await User.findByIdAndUpdate(user.id, { lastLogin: new Date() })

        if (!user.name) {
          await User.findByIdAndUpdate(user.id, {
            name: user.name || user.email!.split('@')[0],
            role: 'user',
          })
        }
        token.name = user.name || user.email!.split('@')[0]
        token.role = (user as { role: string }).role
        token.id = user.id
      }

      if (session?.user?.name && trigger === 'update') {
        token.name = session.user.name
      }
      return token
    },
    session: async ({ session, user, trigger, token }) => {
      session.user.id = token.id as string // Folosește token.id în loc de token.sub pentru consistență
      session.user.role = token.role as string
      session.user.name = token.name

      if (trigger === 'update') {
        session.user.name = user.name
      }

      if (token.id) {
        await connectToDatabase()
        const dbUser = (await User.findById(token.id).lean()) as IUser | null

        if (!dbUser || dbUser.active === false) {
          // Returnăm un obiect care forțează expirarea în loc de null
          return {
            ...session,
            expires: new Date(0).toISOString(), // Setează expirarea în anul 1970
          }
        }

        if (dbUser) {
          session.user.email = dbUser.email
          session.user.phone = dbUser.phone || ''
          session.user.role = dbUser.role
        }
      }

      return session
    },
  },
})
