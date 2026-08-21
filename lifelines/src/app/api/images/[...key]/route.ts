import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

/**
 * Serves LifeLine artwork out of S3.
 *
 * These images sit on the public homepage and on each group's page, so they
 * cannot be presigned links that expire, and the bucket itself stays private
 * because it also holds the leader training videos. This route is the narrow
 * public window onto it.
 *
 * Only the lifelines/ prefix is reachable. Without that check this would be an
 * open proxy for every private object in the bucket.
 */

const PUBLIC_PREFIX = 'lifelines/'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
})

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: segments } = await params
    const key = segments.join('/')

    // Reject traversal before anything else looks at the path.
    if (key.includes('..') || !key.startsWith(PUBLIC_PREFIX)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const extension = key.split('.').pop()?.toLowerCase() ?? ''
    const contentType = CONTENT_TYPES[extension]
    if (!contentType) {
      return new NextResponse('Not found', { status: 404 })
    }

    const bucket = process.env.AWS_S3_BUCKET_NAME
    if (!bucket) {
      return new NextResponse('File storage is not configured', { status: 500 })
    }

    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    if (!object.Body) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Images are replaced by uploading under a new key, never by overwriting
    // one, so these can be cached hard.
    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        'Content-Type': object.ContentType || contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(object.ContentLength ? { 'Content-Length': String(object.ContentLength) } : {}),
      },
    })
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return new NextResponse('Not found', { status: 404 })
    }
    console.error('Error serving image:', error)
    return new NextResponse('Failed to load the image', { status: 500 })
  }
}
