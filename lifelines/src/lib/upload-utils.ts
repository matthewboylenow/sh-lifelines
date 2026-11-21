import { UPLOAD_RULES, UploadPurpose, uploadContentType } from './upload-rules'

export interface UploadResult {
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
}

/**
 * Upload a file straight to storage.
 *
 * The server only signs the upload; the file itself goes from the browser to
 * S3. Sending it through the server failed for anything over 4.5 MB, which is
 * the most Vercel accepts in one request.
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose = 'lifeline-image',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // Say what's wrong before anything is sent.
  const rule = UPLOAD_RULES[purpose]
  if (!uploadContentType(purpose, file.name, file.type)) {
    throw new Error(rule.typeError)
  }
  if (file.size > rule.maxBytes) {
    throw new Error(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${rule.maxBytes / 1024 / 1024} MB.`
    )
  }

  const response = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, fileName: file.name, fileType: file.type, fileSize: file.size }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'Could not start the upload')
  }
  const { uploadUrl, contentType, fileUrl } = result.data as {
    uploadUrl: string
    contentType: string
    fileUrl: string
  }

  // XMLHttpRequest rather than fetch, for upload progress on large files.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error('The upload was not accepted. Please try again.'))
    xhr.onerror = () => reject(new Error('The upload failed. Check your connection and try again.'))
    xhr.send(file)
  })

  return { fileName: file.name, fileUrl, fileSize: file.size, fileType: contentType }
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