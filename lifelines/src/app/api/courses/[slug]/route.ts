import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasAnyRole } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'

/** Training is for people who lead or support groups. */
const TRAINING_ROLES = [
  UserRole.ADMIN,
  UserRole.FORMATION_SUPPORT_TEAM,
  UserRole.LIFELINE_LEADER,
]

// GET /api/courses/[slug] - A course, its lessons, and the caller's progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return createErrorResponse('Unauthorized', 401)
    if (!hasAnyRole(session.user.roles, TRAINING_ROLES)) {
      return createErrorResponse('Forbidden', 403)
    }

    const { slug } = await params
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          orderBy: { position: 'asc' },
          include: {
            // Only this user's progress, never anyone else's.
            progress: {
              where: { userId: session.user.id },
              select: { completedAt: true, lastPosition: true },
            },
          },
        },
      },
    })

    if (!course || (!course.isPublished && !hasAnyRole(session.user.roles, [UserRole.ADMIN]))) {
      return createErrorResponse('Course not found', 404)
    }

    const lessons = course.lessons.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description,
      position: l.position,
      hasVideo: Boolean(l.videoUrl),
      completed: Boolean(l.progress[0]?.completedAt),
      lastPosition: l.progress[0]?.lastPosition ?? 0,
    }))

    const completed = lessons.filter(l => l.completed).length
    // Resume at the first unfinished lesson, or stay on the last one when done.
    const nextLesson = lessons.find(l => !l.completed) ?? lessons[lessons.length - 1] ?? null

    return createSuccessResponse({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      isPublished: course.isPublished,
      lessons,
      progress: {
        completed,
        total: lessons.length,
        percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        nextLessonId: nextLesson?.id ?? null,
      },
    })
  } catch (error) {
    console.error('Error loading course:', error)
    return createErrorResponse('Failed to load the course', 500)
  }
}
