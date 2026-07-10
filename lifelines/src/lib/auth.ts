import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { normalizePhone } from "./phone"

// Temporary hardcoded test logins shown on the login page - REMOVE BEFORE GO-LIVE
// These always work regardless of database state: on first sign-in the user
// record is created automatically with the correct role.
const TEST_ACCOUNTS: Record<string, { password: string; displayName: string; roles: UserRole[] }> = {
  'admin@sainthelen.org': {
    password: 'admin123',
    displayName: 'System Administrator',
    roles: [UserRole.ADMIN],
  },
  'formation@sainthelen.org': {
    password: 'support123',
    displayName: 'Formation Support Team',
    roles: [UserRole.FORMATION_SUPPORT_TEAM],
  },
  'leader1@sainthelen.org': {
    password: 'leader123',
    displayName: 'John Smith',
    roles: [UserRole.LIFELINE_LEADER],
  },
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Temporary test logins - REMOVE BEFORE GO-LIVE
        const testEmail = credentials.email.toLowerCase().trim()
        const testAccount = TEST_ACCOUNTS[testEmail]
        if (testAccount && credentials.password === testAccount.password) {
          const testUser = await prisma.user.upsert({
            where: { email: testEmail },
            update: {
              isActive: true,
              roles: testAccount.roles,
            },
            create: {
              email: testEmail,
              password: await bcrypt.hash(testAccount.password, 12),
              displayName: testAccount.displayName,
              roles: testAccount.roles,
              isActive: true,
            },
          })

          return {
            id: testUser.id,
            email: testUser.email,
            name: testUser.displayName || testUser.username || testUser.email,
            roles: testUser.roles,
          }
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
    }),
    CredentialsProvider({
      id: "sms",
      name: "SMS Login",
      credentials: {
        cellPhone: { label: "Cell Phone", type: "text" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        // The SMS code is verified HERE, server-side, against the hashed code
        // stored by /api/auth/sms/send-code. Never trust a client-supplied
        // identity — possession of a valid, unexpired code is the only proof
        // of ownership that grants a session.
        if (!credentials?.cellPhone || !credentials?.code) {
          return null
        }

        if (!/^\d{6}$/.test(credentials.code)) {
          return null
        }

        const normalized = normalizePhone(credentials.cellPhone)

        const user = await prisma.user.findFirst({
          where: { cellPhone: normalized, isActive: true },
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
            roles: true,
            smsVerificationCode: true,
            smsCodeExpiry: true,
          }
        })

        if (!user || !user.smsVerificationCode || !user.smsCodeExpiry) {
          return null
        }

        // Reject and clear expired codes
        if (new Date() > user.smsCodeExpiry) {
          await prisma.user.update({
            where: { id: user.id },
            data: { smsVerificationCode: null, smsCodeExpiry: null },
          })
          return null
        }

        const isValid = await bcrypt.compare(credentials.code, user.smsVerificationCode)
        if (!isValid) {
          return null
        }

        // Consume the code so it cannot be replayed
        await prisma.user.update({
          where: { id: user.id },
          data: {
            smsVerificationCode: null,
            smsCodeExpiry: null,
            cellPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        })

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
