import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  withAuth
} from '@/lib/api-utils'
import { hashPassword } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// WordPress user import schema
const wordpressUserSchema = z.object({
  users: z.array(z.object({
    user_login: z.string(),
    user_email: z.string().email(),
    display_name: z.string().optional(),
    user_registered: z.string().optional(),
    meta: z.record(z.string(), z.any()).optional(),
    roles: z.array(z.string()).optional()
  }))
})

// Map WordPress roles to our UserRole enum
function mapWordPressRole(wpRoles: string[] = []): UserRole {
  if (wpRoles.includes('administrator')) return UserRole.ADMIN
  if (wpRoles.includes('lifeline_leader') || wpRoles.includes('editor')) return UserRole.LIFELINE_LEADER
  if (wpRoles.includes('formation_support') || wpRoles.includes('contributor')) return UserRole.FORMATION_SUPPORT_TEAM
  return UserRole.MEMBER
}

// POST /api/migration/wordpress/users - Import WordPress users
export async function POST(req: NextRequest) {
  return withAuth(async (req: NextRequest, session: any) => {
    // Only admins can import users
    if (session.user.role !== UserRole.ADMIN) {
      return createErrorResponse('Only administrators can import users', 403)
    }

    try {
      const body = await req.json()
    const { users } = wordpressUserSchema.parse(body)

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        email: string
        status: 'imported' | 'skipped' | 'error'
        message: string
      }>
    }

    for (const wpUser of users) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: wpUser.user_email }
        })

        if (existingUser) {
          results.skipped++
          results.details.push({
            email: wpUser.user_email,
            status: 'skipped',
            message: 'User already exists'
          })
          continue
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8)
        const hashedPassword = await hashPassword(tempPassword)

        // Map WordPress role to our role system
        const role = mapWordPressRole(wpUser.roles)

        // Create user
        await prisma.user.create({
          data: {
            email: wpUser.user_email,
            password: hashedPassword,
            displayName: wpUser.display_name || wpUser.user_login,
            role,
            isActive: true,
            // Store original WordPress data for reference
            // Note: We'd need to add these fields to the schema if needed
            createdAt: wpUser.user_registered ? new Date(wpUser.user_registered) : new Date(),
          }
        })

        results.imported++
        results.details.push({
          email: wpUser.user_email,
          status: 'imported',
          message: `Imported as ${role} with temporary password: ${tempPassword}`
        })

      } catch (userError) {
        console.error('Error importing user:', wpUser.user_email, userError)
        results.errors++
        results.details.push({
          email: wpUser.user_email,
          status: 'error',
          message: userError instanceof Error ? userError.message : 'Unknown error'
        })
      }
    }

    return createSuccessResponse(results, 
      `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`
    )

    } catch (error) {
      console.error('Error importing WordPress users:', error)
      return createErrorResponse('Failed to import WordPress users', 500)
    }
  })(req)
}