import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  parsePaginationParams,
  createPaginatedResponse 
} from '@/lib/api-utils'
import { registerSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'

// GET /api/users - List all users (Admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    
    // Parse filters
    const filters = {
      role: searchParams.get('role') as UserRole | undefined,
      search: searchParams.get('search'),
      active: searchParams.get('active') === 'true' ? true : searchParams.get('active') === 'false' ? false : undefined,
    }

    // Build where clause
    const where: any = {}

    if (filters.role) {
      where.role = filters.role
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
          role: true,
          isActive: true,
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
          { role: 'asc' },
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
    const body = await req.json()
    const validatedData = registerSchema.parse(body)
    const { email, password, displayName, role } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return createErrorResponse('User with this email already exists', 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName: displayName || null,
        role: role || UserRole.MEMBER,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
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