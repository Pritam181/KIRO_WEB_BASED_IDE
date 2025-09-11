import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { 
  FileContent, 
  FileTree, 
  FileMetadata, 
  CreateFileRequest, 
  UpdateFileRequest,
  FileOperationResult,
  FileValidationError,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE
} from '../types/file'

export class FileService {
  private basePath: string

  constructor(basePath: string = './projects') {
    this.basePath = path.resolve(basePath)
  }

  /**
   * Initialize the file service by creating the base directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.access(this.basePath)
    } catch {
      await fs.mkdir(this.basePath, { recursive: true })
    }
  }

  /**
   * Get the full path for a project file
   */
  private getProjectPath(projectId: string, filePath: string = ''): string {
    const projectPath = path.join(this.basePath, projectId)
    if (!filePath) return projectPath
    
    const fullPath = path.join(projectPath, filePath)
    
    // Security check: ensure path is within project directory
    if (!fullPath.startsWith(projectPath)) {
      throw new Error('Invalid file path: path traversal detected')
    }
    
    return fullPath
  }

  /**
   * Validate file path and content
   */
  private validateFile(filePath: string, content?: string): FileValidationError[] {
    const errors: FileValidationError[] = []

    // Validate path
    if (!filePath || filePath.trim() === '') {
      errors.push({ field: 'path', message: 'File path is required' })
    }

    if (filePath.includes('..')) {
      errors.push({ field: 'path', message: 'Path traversal is not allowed' })
    }

    if (filePath.startsWith('/') || filePath.startsWith('\\')) {
      errors.push({ field: 'path', message: 'Absolute paths are not allowed' })
    }

    // Validate content size
    if (content && Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE) {
      errors.push({ 
        field: 'content', 
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      })
    }

    return errors
  }

  /**
   * Calculate file checksum
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex')
  }

  /**
   * Detect file language based on extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'plaintext',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bat': 'batch',
      '.ps1': 'powershell'
    }
    
    return languageMap[ext] || 'plaintext'
  }

  /**
   * Create a new file or folder
   */
  async createFile(projectId: string, request: CreateFileRequest): Promise<FileOperationResult> {
    try {
      const errors = this.validateFile(request.path, request.content)
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation failed',
          data: { errors }
        }
      }

      const fullPath = this.getProjectPath(projectId, request.path)
      
      // Check if file already exists
      try {
        await fs.access(fullPath)
        return {
          success: false,
          message: 'File or folder already exists'
        }
      } catch {
        // File doesn't exist, continue with creation
      }

      // Create parent directories if they don't exist
      const parentDir = path.dirname(fullPath)
      await fs.mkdir(parentDir, { recursive: true })

      if (request.type === 'folder') {
        await fs.mkdir(fullPath, { recursive: true })
        return {
          success: true,
          message: 'Folder created successfully'
        }
      } else {
        const content = request.content || ''
        await fs.writeFile(fullPath, content, 'utf8')
        
        const stats = await fs.stat(fullPath)
        const fileContent: FileContent = {
          path: request.path,
          content,
          language: this.detectLanguage(request.path),
          size: stats.size,
          lastModified: stats.mtime,
          checksum: this.calculateChecksum(content)
        }

        // Notify sync service about file creation
        try {
          const { syncService } = await import('./syncService');
          await syncService.handleFileOperation('create', projectId, request.path, content);
        } catch (error) {
          console.warn('Failed to sync file creation:', error);
        }

        return {
          success: true,
          message: 'File created successfully',
          data: fileContent
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create ${request.type}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Read file content
   */
  async readFile(projectId: string, filePath: string): Promise<FileOperationResult> {
    try {
      const errors = this.validateFile(filePath)
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation failed',
          data: { errors }
        }
      }

      const fullPath = this.getProjectPath(projectId, filePath)
      
      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        return {
          success: false,
          message: 'Cannot read directory as file'
        }
      }

      const content = await fs.readFile(fullPath, 'utf8')
      const fileContent: FileContent = {
        path: filePath,
        content,
        language: this.detectLanguage(filePath),
        size: stats.size,
        lastModified: stats.mtime,
        checksum: this.calculateChecksum(content)
      }

      return {
        success: true,
        message: 'File read successfully',
        data: fileContent
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          message: 'File not found'
        }
      }
      
      return {
        success: false,
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Update file content
   */
  async updateFile(projectId: string, request: UpdateFileRequest): Promise<FileOperationResult> {
    try {
      const errors = this.validateFile(request.path, request.content)
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation failed',
          data: { errors }
        }
      }

      const fullPath = this.getProjectPath(projectId, request.path)
      
      // Check if file exists
      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        return {
          success: false,
          message: 'Cannot update directory as file'
        }
      }

      await fs.writeFile(fullPath, request.content, 'utf8')
      
      const newStats = await fs.stat(fullPath)
      const fileContent: FileContent = {
        path: request.path,
        content: request.content,
        language: this.detectLanguage(request.path),
        size: newStats.size,
        lastModified: newStats.mtime,
        checksum: this.calculateChecksum(request.content)
      }

      // Notify sync service about file update
      try {
        const { syncService } = await import('./syncService');
        await syncService.handleFileOperation('update', projectId, request.path, request.content);
      } catch (error) {
        console.warn('Failed to sync file update:', error);
      }

      return {
        success: true,
        message: 'File updated successfully',
        data: fileContent
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          message: 'File not found'
        }
      }
      
      return {
        success: false,
        message: `Failed to update file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Delete file or folder
   */
  async deleteFile(projectId: string, filePath: string): Promise<FileOperationResult> {
    try {
      const errors = this.validateFile(filePath)
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation failed',
          data: { errors }
        }
      }

      const fullPath = this.getProjectPath(projectId, filePath)
      
      const stats = await fs.stat(fullPath)
      
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true })
        return {
          success: true,
          message: 'Folder deleted successfully'
        }
      } else {
        await fs.unlink(fullPath)
        return {
          success: true,
          message: 'File deleted successfully'
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          message: 'File or folder not found'
        }
      }
      
      return {
        success: false,
        message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Generate file tree for a project
   */
  async generateFileTree(projectId: string, rootPath: string = ''): Promise<FileOperationResult> {
    try {
      const fullPath = this.getProjectPath(projectId, rootPath)
      
      // Check if project directory exists
      try {
        await fs.access(fullPath)
      } catch {
        // Create project directory if it doesn't exist
        await fs.mkdir(fullPath, { recursive: true })
        return {
          success: true,
          message: 'File tree generated successfully',
          data: {}
        }
      }

      const fileTree = await this.buildFileTree(fullPath, rootPath)
      
      return {
        success: true,
        message: 'File tree generated successfully',
        data: fileTree
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate file tree: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Recursively build file tree
   */
  private async buildFileTree(fullPath: string, relativePath: string): Promise<FileTree> {
    const fileTree: FileTree = {}
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const entryPath = relativePath ? path.join(relativePath, entry.name).replace(/\\/g, '/') : entry.name
        const entryFullPath = path.join(fullPath, entry.name)
        
        const stats = await fs.stat(entryFullPath)
        const metadata: FileMetadata = {
          size: stats.size,
          lastModified: stats.mtime,
          type: entry.isDirectory() ? 'folder' : 'file'
        }

        if (entry.isDirectory()) {
          const children = await this.buildFileTree(entryFullPath, entryPath)
          fileTree[entryPath] = {
            type: 'folder',
            metadata,
            children
          }
        } else {
          fileTree[entryPath] = {
            type: 'file',
            metadata
          }
        }
      }
    } catch (error) {
      // If we can't read a directory, skip it
      console.warn(`Warning: Could not read directory ${fullPath}:`, error)
    }
    
    return fileTree
  }

  /**
   * Validate uploaded file
   */
  validateUploadedFile(file: Express.Multer.File): FileValidationError[] {
    const errors: FileValidationError[] = []

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      })
    }

    // Check file type
    if (!SUPPORTED_FILE_TYPES.includes(file.mimetype as any)) {
      errors.push({
        field: 'mimetype',
        message: `File type ${file.mimetype} is not supported`
      })
    }

    // Check filename
    if (!file.originalname || file.originalname.trim() === '') {
      errors.push({
        field: 'filename',
        message: 'Filename is required'
      })
    }

    if (file.originalname.includes('..')) {
      errors.push({
        field: 'filename',
        message: 'Invalid filename: path traversal detected'
      })
    }

    return errors
  }

  /**
   * Save uploaded file
   */
  async saveUploadedFile(
    projectId: string, 
    file: Express.Multer.File, 
    targetPath?: string
  ): Promise<FileOperationResult> {
    try {
      const errors = this.validateUploadedFile(file)
      if (errors.length > 0) {
        return {
          success: false,
          message: 'File validation failed',
          data: { errors }
        }
      }

      const fileName = targetPath || file.originalname
      const fullPath = this.getProjectPath(projectId, fileName)
      
      // Create parent directories if they don't exist
      const parentDir = path.dirname(fullPath)
      await fs.mkdir(parentDir, { recursive: true })

      // Write file
      await fs.writeFile(fullPath, file.buffer)
      
      const stats = await fs.stat(fullPath)
      const fileContent: FileContent = {
        path: fileName,
        content: file.buffer.toString('utf8'),
        language: this.detectLanguage(fileName),
        size: stats.size,
        lastModified: stats.mtime,
        checksum: this.calculateChecksum(file.buffer.toString('utf8'))
      }

      return {
        success: true,
        message: 'File uploaded successfully',
        data: fileContent
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Export singleton instance
export const fileService = new FileService()