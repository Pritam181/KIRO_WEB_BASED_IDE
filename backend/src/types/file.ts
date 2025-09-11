export interface FileContent {
  path: string
  content: string
  language: string
  size: number
  lastModified: Date
  checksum: string
}

export interface FileMetadata {
  size: number
  lastModified: Date
  type: 'file' | 'folder'
  mimeType?: string
}

export interface FileTree {
  [path: string]: {
    type: 'file' | 'folder'
    children?: FileTree
    metadata?: FileMetadata
  }
}

export interface CreateFileRequest {
  path: string
  content?: string
  type: 'file' | 'folder'
}

export interface UpdateFileRequest {
  path: string
  content: string
}

export interface FileUpload {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

export interface FileOperationResult {
  success: boolean
  message: string
  data?: any
}

export interface FileValidationError {
  field: string
  message: string
}

export const SUPPORTED_FILE_TYPES = [
  // Text files
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/markdown',
  'text/xml',
  'text/csv',
  
  // Code files
  'application/javascript',
  'application/json',
  'application/xml',
  'application/x-typescript',
  
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_UPLOAD = 10