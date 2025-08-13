export interface UploadResult {
  fileName: string
  uploadedFileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedAt: string
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to upload file')
  }

  const result = await response.json()
  return result.data
}

export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  if (fileType.includes('word')) return '📝'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️'
  return '📁'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function validateImageFile(file: File): string | null {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  if (file.size > maxSize) {
    return 'File size must be less than 5MB'
  }

  if (!allowedTypes.includes(file.type)) {
    return 'File must be a JPEG, PNG, WebP, or GIF image'
  }

  return null
}

export function validateDocumentFile(file: File): string | null {
  const maxSize = 10 * 1024 * 1024 // 10MB for documents
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  if (file.size > maxSize) {
    return 'File size must be less than 10MB'
  }

  if (!allowedTypes.includes(file.type)) {
    return 'File must be a PDF, Word document, or Excel spreadsheet'
  }

  return null
}