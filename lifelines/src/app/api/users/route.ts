import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginatedResponse
} from '@/lib/api-utils'
import { registerSchema } from '@/lib/validations'
import { hashPassword, hasAnyRole, hasRole } from '@/lib/auth-utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'

// GET /api/users - List users (any dashboard role; PII limited to admins)
export async function GET(req: NextRequest) {
  try {
    // Require an authenticated dashboard user. Leaders and support staff need
    // this to populate leader/support-contact pickers, so it is not admin-only,
    // but phone numbers are withheld from non-admins below.
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }
    if (!hasAnyRole(session.user.roles, [UserRole.ADMIN, UserRole.FORMATION_SUPPORT_TEAM, UserRole.LIFELINE_LEADER])) {
      return createErrorResponse('Forbidden', 403)
    }
    const isAdmin = hasRole(session.user.roles, UserRole.ADMIN)

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)

    // Parse filters
    const filters = {
      role: searchParams.get('role') as UserRole | undefined,
      roles: searchParams.get('roles')?.split(',').filter(Boolean) as UserRole[] | undefined,
      search: searchParams.get('search'),
      active: searchParams.get('active') === 'true' ? true : searchParams.get('active') === 'false' ? false : undefined,
    }

    // Build where clause
    const where: any = {}

    // Support single role or multiple roles filter
    if (filters.role) {
      where.roles = { has: filters.role }
    } else if (filters.roles && filters.roles.length > 0) {
      where.roles = { hasSome: filters.roles }
    }

    if (filters.active !== undefined) {
      where.isActive = filters.active
    }

    if (filters.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          // Phone numbers are PII — only expose to admins
          cellPhone: isAdmin,
          roles: true,
          isActive: true,
          lastLoginAt: true,
          // The most recent invitation and what became of it, so an admin can
          // tell "never arrived" from "arrived and ignored".
          emailDeliveries: isAdmin
            ? {
                where: { kind: 'account-setup' },
                orderBy: { sentAt: 'desc' },
                take: 1,
                select: {
                  sentAt: true,
                  deliveredAt: true,
                  openedAt: true,
                  clickedAt: true,
                  bouncedAt: true,
                  lastEvent: true,
                  lastError: true,
                },
              }
            : false,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ledLifeLines: true,
              formationRequests: true,
              supportTickets: true,
            }
          }
        },
        orderBy: [
          { displayName: 'asc' },
          { email: 'asc' }
        ],
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    return createSuccessResponse(
      createPaginatedResponse(users, total, page, limit)
    )
  } catch (error) {
    console.error('Error fetching users:', error)
    return createErrorResponse('Failed to fetch users', 500)
  }
}

// POST /api/users - Create new user (Admin only)
export async function POST(req: NextRequest) {
  try {
    // Admin-only: this endpoint accepts a `roles` array, so leaving it open
    // would allow anyone to mint an admin account.
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return createErrorResponse('Unauthorized', 401)
    }
    if (!hasRole(session.user.roles, UserRole.ADMIN)) {
      return createErrorResponse('Forbidden', 403)
    }

    const body = await req.json()
    const validatedData = registerSchema.parse(body)
    const { email, password, displayName, roles, role } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return createErrorResponse('User with this email already exists', 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Determine roles: prefer roles array, fall back to single role
    const userRoles = roles && roles.length > 0
      ? roles
      : role ? [role] : [UserRole.MEMBER]

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName: displayName || null,
        roles: userRoles,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        isActive: true,
        createdAt: true,
      }
    })

    return createSuccessResponse(user, 'User created successfully')
  } catch (error) {
    console.error('Error creating user:', error)
    return createErrorResponse('Failed to create user', 500)
  }
}
