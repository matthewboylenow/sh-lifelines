import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'lifelines-uploads'

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

// Upload file to S3
export async function uploadFileToS3(
  file: Buffer, 
  key: string, 
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return { success: false, error: 'AWS credentials not configured' }
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: metadata,
    })

    await s3Client.send(command)

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
    
    return {
      success: true,
      url,
      key
    }
  } catch (error) {
    console.error('S3 upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

// Generate presigned URL for direct uploads
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return { success: false, error: 'AWS credentials not configured' }
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn })
    
    return { success: true, url }
  } catch (error) {
    console.error('Presigned URL generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'URL generation failed'
    }
  }
}

// Generate presigned URL for downloads
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn })
    
    return { success: true, url }
  } catch (error) {
    console.error('Download URL generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'URL generation failed'
    }
  }
}

// Delete file from S3
export async function deleteFileFromS3(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
    
    return { success: true }
  } catch (error) {
    console.error('S3 delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

// Helper function to generate file keys
export function generateFileKey(
  userId: string,
  category: 'lifeline' | 'resource' | 'profile',
  filename: string
): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = filename.split('.').pop()
  
  return `${category}/${userId}/${timestamp}-${randomString}.${extension}`
}

// Helper function to validate file type
export function isValidFileType(
  file: File, 
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.type)
}

// Helper function to validate file size
export function isValidFileSize(
  file: File, 
  maxSizeInBytes: number
): boolean {
  return file.size <= maxSizeInBytes
}

// Constants for file validation
export const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]

export const VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo' // AVI
]

export const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

export const ALL_ALLOWED_TYPES = [
  ...IMAGE_TYPES,
  ...VIDEO_TYPES,
  ...DOCUMENT_TYPES
]

export const MAX_FILE_SIZE = {
  IMAGE: 5 * 1024 * 1024,    // 5MB
  VIDEO: 100 * 1024 * 1024,  // 100MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
}