import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.isActive) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username || user.email,
          roles: user.roles,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          roles: user.roles,
          // Backward compat: keep role for any code that reads it during migration
          role: user.roles?.[0],
          userId: user.id,
        }
      }
      return token
    },
    async session({ session, token }) {
      // Backward compat: support both old single-role tokens and new multi-role tokens
      const roles = (token.roles || (token.role ? [token.role] : [])) as UserRole[]
      return {
        ...session,
        user: {
          ...session.user,
          roles,
          // Keep role as first role for backward compatibility during migration
          role: roles[0] || UserRole.MEMBER,
          id: token.userId as string,
        }
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
      roles: UserRole[]
    }
  }

  interface User {
    role?: UserRole
    roles: UserRole[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    roles: UserRole[]
    userId: string
  }
}
