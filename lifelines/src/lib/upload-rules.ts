/**
 * What may be uploaded, and where it goes. Shared by the browser (to explain a
 * problem before uploading) and the server (which decides).
 */
export type UploadPurpose = 'resource' | 'lifeline-image'

const MB = 1024 * 1024

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const RESOURCE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ...IMAGE_TYPES,
}

export const UPLOAD_RULES: Record<
  UploadPurpose,
  { folder: string; maxBytes: number; types: Record<string, string>; typeError: string }
> = {
  resource: {
    folder: 'resource',
    // Large PDFs and the occasional video; uploads go straight to storage.
    maxBytes: 500 * MB,
    types: RESOURCE_TYPES,
    typeError: 'Upload a PDF, Word, Excel or PowerPoint file, an image, audio or video.',
  },
  'lifeline-image': {
    // Served publicly by /api/images, which only reads this folder.
    folder: 'lifelines/uploads',
    maxBytes: 15 * MB,
    types: IMAGE_TYPES,
    typeError: 'Upload a JPEG, PNG, WebP or GIF image.',
  },
}

/**
 * The content type to store the file as, or null if it isn't allowed. Decided
 * by the file's extension: browsers report types inconsistently, and some
 * report none at all.
 */
export function uploadContentType(purpose: UploadPurpose, fileName: string, _reportedType?: string): string | null {
  const extension = fileName.toLowerCase().split('.').pop() ?? ''
  return UPLOAD_RULES[purpose].types[extension] ?? null
}
