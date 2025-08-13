import { NextRequest } from 'next/server'
import { 
  createErrorResponse, 
  createSuccessResponse
} from '@/lib/api-utils'
import { 
  uploadFileToS3,
  generateFileKey,
  isValidFileType,
  isValidFileSize,
  ALL_ALLOWED_TYPES,
  MAX_FILE_SIZE,
  IMAGE_TYPES,
  VIDEO_TYPES,
  DOCUMENT_TYPES
} from '@/lib/s3'
import { UserRole } from '@prisma/client'

// POST /api/upload - Upload file to S3
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string || 'resource'
    
    if (!file) {
      return createErrorResponse('No file provided', 400)
    }

    // Determine max file size based on type
    let maxSize = MAX_FILE_SIZE.DOCUMENT
    if (IMAGE_TYPES.includes(file.type)) {
      maxSize = MAX_FILE_SIZE.IMAGE
    } else if (VIDEO_TYPES.includes(file.type)) {
      maxSize = MAX_FILE_SIZE.VIDEO
    }

    // Validate file size
    if (!isValidFileSize(file, maxSize)) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return createErrorResponse(`File size exceeds ${maxSizeMB}MB limit`, 400)
    }

    // Validate file type
    if (!isValidFileType(file, ALL_ALLOWED_TYPES)) {
      return createErrorResponse(
        'Invalid file type. Allowed types: Images, Videos, and Documents', 
        400
      )
    }

    // TODO: Get actual user ID from session
    const userId = 'temp-user-id'
    
    // Generate S3 key
    const fileKey = generateFileKey(
      userId, 
      category as 'lifeline' | 'resource' | 'profile',
      file.name
    )

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to S3
    const uploadResult = await uploadFileToS3(
      buffer,
      fileKey,
      file.type,
      {
        originalName: file.name,
        uploadedBy: userId,
        category: category
      }
    )

    if (!uploadResult.success) {
      return createErrorResponse(
        uploadResult.error || 'Failed to upload file',
        500
      )
    }
      
    return createSuccessResponse({
      fileName: file.name,
      fileKey: uploadResult.key,
      fileUrl: uploadResult.url,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    }, 'File uploaded successfully to S3')

  } catch (error) {
    console.error('Error uploading file:', error)
    return createErrorResponse('Failed to upload file', 500)
  }
}