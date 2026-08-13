import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils'
import { hasAnyRole } from '@/lib/auth-utils'
import { UserRole } from '@prisma/client'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { parseVideoUrl } from '@/lib/video'
import { z } from 'zod'

const TRAINING_ROLES = [
  UserRole.ADMIN,
  UserRole.FORMATION_SUPPORT_TEAM,
  UserRole.LIFELINE_LEADER,
]

const LINK_TTL_SECONDS = 60 * 60 * 4

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
})

async function requireTrainingAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: createErrorResponse('Unauthorized', 401) }
  if (!hasAnyRole(session.user.roles, TRAINING_ROLES)) {
    return { error: createErrorResponse('Forbidden', 403) }
  }
  return { session }
}

// GET /api/lessons/[id] - A lesson, ready to play, with its neighbours
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireTrainingAccess()
    if (error) return error

    const { id } = await params
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, slug: true, title: true, isPublished: true } },
        progress: {
          where: { userId: session!.user.id },
          select: { completedAt: true, lastPosition: true },
        },
      },
    })

    if (!lesson) return createErrorResponse('Lesson not found', 404)
    if (!lesson.course.isPublished && !hasAnyRole(session!.user.roles, [UserRole.ADMIN])) {
      return createErrorResponse('Lesson not found', 404)
    }

    // Privately stored media is signed here so the key never reaches the browser.
    let playbackUrl: string | null = lesson.videoUrl
    const parsed = parseVideoUrl(lesson.videoUrl)
    if (parsed.kind === 'private' && lesson.videoUrl) {
      const bucket = process.env.AWS_S3_BUCKET_NAME
      if (!bucket) return createErrorResponse('File storage is not configured', 500)
      playbackUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: lesson.videoUrl.slice('s3://'.length) }),
        { expiresIn: LINK_TTL_SECONDS }
      )
    }

    const siblings = await prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        position: true,
        progress: {
          where: { userId: session!.user.id },
          select: { completedAt: true },
        },
      },
    })

    const index = siblings.findIndex(s => s.id === lesson.id)

    return createSuccessResponse({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      position: lesson.position,
      videoKind: parsed.kind,
      playbackUrl,
      embedUrl: parsed.embedUrl,
      completed: Boolean(lesson.progress[0]?.completedAt),
      lastPosition: lesson.progress[0]?.lastPosition ?? 0,
      course: lesson.course,
      lessons: siblings.map(s => ({
        id: s.id,
        title: s.title,
        position: s.position,
        completed: Boolean(s.progress[0]?.completedAt),
      })),
      previousLessonId: index > 0 ? siblings[index - 1].id : null,
      nextLessonId: index >= 0 && index < siblings.length - 1 ? siblings[index + 1].id : null,
    })
  } catch (error) {
    console.error('Error loading lesson:', error)
    return createErrorResponse('Failed to load the lesson', 500)
  }
}

const progressSchema = z.object({
  completed: z.boolean().optional(),
  lastPosition: z.number().int().min(0).max(60 * 60 * 24).optional(),
})

// POST /api/lessons/[id] - Record progress for the signed-in user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireTrainingAccess()
    if (error) return error

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = progressSchema.safeParse(body)
    if (!parsed.success) return createErrorResponse('Invalid progress update', 400)

    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { id: true } })
    if (!lesson) return createErrorResponse('Lesson not found', 404)

    const { completed, lastPosition } = parsed.data
    // Progress is per user, so the pair (user, lesson) is the identity here.
    const record = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: session!.user.id, lessonId: id } },
      create: {
        userId: session!.user.id,
        lessonId: id,
        completedAt: completed ? new Date() : null,
        lastPosition: lastPosition ?? 0,
      },
      update: {
        ...(completed !== undefined && { completedAt: completed ? new Date() : null }),
        ...(lastPosition !== undefined && { lastPosition }),
      },
      select: { completedAt: true, lastPosition: true },
    })

    return createSuccessResponse({
      completed: Boolean(record.completedAt),
      lastPosition: record.lastPosition,
    })
  } catch (error) {
    console.error('Error saving lesson progress:', error)
    return createErrorResponse('Failed to save your progress', 500)
  }
}
