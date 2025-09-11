import fs from 'fs/promises'
import path from 'path'
import { FileService } from '../services/fileService'
import { CreateFileRequest, UpdateFileRequest } from '../types/file'

describe('FileService', () => {
  let fileService: FileService
  const testBasePath = path.join(__dirname, 'test-projects')
  const testProjectId = 'test-project-123'

  beforeAll(async () => {
    fileService = new FileService(testBasePath)
    await fileService.initialize()
  })

  beforeEach(async () => {
    // Clean up test project directory before each test
    try {
      await fs.rm(path.join(testBasePath, testProjectId), { recursive: true })
    } catch {
      // Directory doesn't exist, ignore
    }
  })

  afterAll(async () => {
    // Clean up test directory after all tests
    try {
      await fs.rm(testBasePath, { recursive: true })
    } catch {
      // Directory doesn't exist, ignore
    }
  })

  describe('createFile', () => {
    it('should create a new file successfully', async () => {
      const request: CreateFileRequest = {
        path: 'test.txt',
        content: 'Hello, World!',
        type: 'file'
      }

      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(true)
      expect(result.message).toBe('File created successfully')
      expect(result.data).toBeDefined()
      expect(result.data.path).toBe('test.txt')
      expect(result.data.content).toBe('Hello, World!')
      expect(result.data.language).toBe('plaintext')
    })

    it('should create a new folder successfully', async () => {
      const request: CreateFileRequest = {
        path: 'src',
        type: 'folder'
      }

      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Folder created successfully')
    })

    it('should create nested files with parent directories', async () => {
      const request: CreateFileRequest = {
        path: 'src/components/Button.tsx',
        content: 'export const Button = () => <button>Click me</button>',
        type: 'file'
      }

      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(true)
      expect(result.data.language).toBe('typescript')
    })

    it('should reject file creation with invalid path', async () => {
      const request: CreateFileRequest = {
        path: '../../../etc/passwd',
        content: 'malicious content',
        type: 'file'
      }

      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Validation failed')
      expect(result.data.errors).toContainEqual({
        field: 'path',
        message: 'Path traversal is not allowed'
      })
    })

    it('should reject file creation with empty path', async () => {
      const request: CreateFileRequest = {
        path: '',
        content: 'test content',
        type: 'file'
      }

      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(false)
      expect(result.data.errors).toContainEqual({
        field: 'path',
        message: 'File path is required'
      })
    })

    it('should reject file creation if file already exists', async () => {
      const request: CreateFileRequest = {
        path: 'duplicate.txt',
        content: 'first content',
        type: 'file'
      }

      // Create file first time
      await fileService.createFile(testProjectId, request)

      // Try to create same file again
      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(false)
      expect(result.message).toBe('File or folder already exists')
    })

    it('should reject file creation with content exceeding size limit', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const request: CreateFileRequest = {
        path: 'large.txt',
        content: largeContent,
        type: 'file'
      }

      const result = await fileService.createFile(testProjectId, request)

      expect(result.success).toBe(false)
      expect(result.data.errors).toContainEqual({
        field: 'content',
        message: 'File size exceeds maximum limit of 10MB'
      })
    })
  })

  describe('readFile', () => {
    beforeEach(async () => {
      // Create a test file
      const request: CreateFileRequest = {
        path: 'read-test.js',
        content: 'console.log("Hello, World!");',
        type: 'file'
      }
      await fileService.createFile(testProjectId, request)
    })

    it('should read file content successfully', async () => {
      const result = await fileService.readFile(testProjectId, 'read-test.js')

      expect(result.success).toBe(true)
      expect(result.data.content).toBe('console.log("Hello, World!");')
      expect(result.data.language).toBe('javascript')
      expect(result.data.checksum).toBeDefined()
    })

    it('should return error for non-existent file', async () => {
      const result = await fileService.readFile(testProjectId, 'non-existent.txt')

      expect(result.success).toBe(false)
      expect(result.message).toBe('File not found')
    })

    it('should reject reading directory as file', async () => {
      // Create a directory first
      await fileService.createFile(testProjectId, { path: 'testdir', type: 'folder' })

      const result = await fileService.readFile(testProjectId, 'testdir')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Cannot read directory as file')
    })

    it('should reject reading file with invalid path', async () => {
      const result = await fileService.readFile(testProjectId, '../../../etc/passwd')

      expect(result.success).toBe(false)
      expect(result.data.errors).toContainEqual({
        field: 'path',
        message: 'Path traversal is not allowed'
      })
    })
  })

  describe('updateFile', () => {
    beforeEach(async () => {
      // Create a test file
      const request: CreateFileRequest = {
        path: 'update-test.py',
        content: 'print("Hello")',
        type: 'file'
      }
      await fileService.createFile(testProjectId, request)
    })

    it('should update file content successfully', async () => {
      const updateRequest: UpdateFileRequest = {
        path: 'update-test.py',
        content: 'print("Hello, Updated World!")'
      }

      const result = await fileService.updateFile(testProjectId, updateRequest)

      expect(result.success).toBe(true)
      expect(result.data.content).toBe('print("Hello, Updated World!")')
      expect(result.data.language).toBe('python')
    })

    it('should return error for non-existent file', async () => {
      const updateRequest: UpdateFileRequest = {
        path: 'non-existent.txt',
        content: 'new content'
      }

      const result = await fileService.updateFile(testProjectId, updateRequest)

      expect(result.success).toBe(false)
      expect(result.message).toBe('File not found')
    })

    it('should reject updating directory as file', async () => {
      // Create a directory first
      await fileService.createFile(testProjectId, { path: 'testdir', type: 'folder' })

      const updateRequest: UpdateFileRequest = {
        path: 'testdir',
        content: 'cannot update directory'
      }

      const result = await fileService.updateFile(testProjectId, updateRequest)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Cannot update directory as file')
    })
  })

  describe('deleteFile', () => {
    beforeEach(async () => {
      // Create test files and folders
      await fileService.createFile(testProjectId, {
        path: 'delete-test.txt',
        content: 'to be deleted',
        type: 'file'
      })
      await fileService.createFile(testProjectId, {
        path: 'delete-folder',
        type: 'folder'
      })
      await fileService.createFile(testProjectId, {
        path: 'delete-folder/nested.txt',
        content: 'nested file',
        type: 'file'
      })
    })

    it('should delete file successfully', async () => {
      const result = await fileService.deleteFile(testProjectId, 'delete-test.txt')

      expect(result.success).toBe(true)
      expect(result.message).toBe('File deleted successfully')

      // Verify file is deleted
      const readResult = await fileService.readFile(testProjectId, 'delete-test.txt')
      expect(readResult.success).toBe(false)
    })

    it('should delete folder recursively', async () => {
      const result = await fileService.deleteFile(testProjectId, 'delete-folder')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Folder deleted successfully')

      // Verify folder and nested file are deleted
      const readResult = await fileService.readFile(testProjectId, 'delete-folder/nested.txt')
      expect(readResult.success).toBe(false)
    })

    it('should return error for non-existent file', async () => {
      const result = await fileService.deleteFile(testProjectId, 'non-existent.txt')

      expect(result.success).toBe(false)
      expect(result.message).toBe('File or folder not found')
    })
  })

  describe('generateFileTree', () => {
    beforeEach(async () => {
      // Create a complex file structure
      await fileService.createFile(testProjectId, {
        path: 'src',
        type: 'folder'
      })
      await fileService.createFile(testProjectId, {
        path: 'src/index.ts',
        content: 'export * from "./components"',
        type: 'file'
      })
      await fileService.createFile(testProjectId, {
        path: 'src/components',
        type: 'folder'
      })
      await fileService.createFile(testProjectId, {
        path: 'src/components/Button.tsx',
        content: 'export const Button = () => <button>Click</button>',
        type: 'file'
      })
      await fileService.createFile(testProjectId, {
        path: 'README.md',
        content: '# Test Project',
        type: 'file'
      })
    })

    it('should generate complete file tree', async () => {
      const result = await fileService.generateFileTree(testProjectId)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      const fileTree = result.data
      
      expect(fileTree['README.md']).toBeDefined()
      expect(fileTree['README.md'].type).toBe('file')
      expect(fileTree['src']).toBeDefined()
      expect(fileTree['src'].type).toBe('folder')
      expect(fileTree['src'].children).toBeDefined()
      
      // Check the actual structure based on how files are stored
      expect(fileTree['src'].children['src/index.ts']).toBeDefined()
      expect(fileTree['src'].children['src/components']).toBeDefined()
      expect(fileTree['src'].children['src/components'].children['src/components/Button.tsx']).toBeDefined()
    })

    it('should generate empty file tree for new project', async () => {
      const result = await fileService.generateFileTree('new-project')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })
  })

  describe('validateUploadedFile', () => {
    it('should validate file successfully', async () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('test content')
      } as Express.Multer.File

      const errors = fileService.validateUploadedFile(mockFile)

      expect(errors).toHaveLength(0)
    })

    it('should reject file with unsupported mime type', async () => {
      const mockFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        buffer: Buffer.from('binary content')
      } as Express.Multer.File

      const errors = fileService.validateUploadedFile(mockFile)

      expect(errors).toContainEqual({
        field: 'mimetype',
        message: 'File type application/x-executable is not supported'
      })
    })

    it('should reject file exceeding size limit', async () => {
      const mockFile = {
        originalname: 'large.txt',
        mimetype: 'text/plain',
        size: 11 * 1024 * 1024, // 11MB
        buffer: Buffer.alloc(11 * 1024 * 1024)
      } as Express.Multer.File

      const errors = fileService.validateUploadedFile(mockFile)

      expect(errors).toContainEqual({
        field: 'size',
        message: 'File size exceeds maximum limit of 10MB'
      })
    })

    it('should reject file with path traversal in filename', async () => {
      const mockFile = {
        originalname: '../../../malicious.txt',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('malicious content')
      } as Express.Multer.File

      const errors = fileService.validateUploadedFile(mockFile)

      expect(errors).toContainEqual({
        field: 'filename',
        message: 'Invalid filename: path traversal detected'
      })
    })
  })

  describe('saveUploadedFile', () => {
    it('should save uploaded file successfully', async () => {
      const mockFile = {
        originalname: 'upload.txt',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('uploaded content')
      } as Express.Multer.File

      const result = await fileService.saveUploadedFile(testProjectId, mockFile)

      expect(result.success).toBe(true)
      expect(result.data.path).toBe('upload.txt')
      expect(result.data.content).toBe('uploaded content')

      // Verify file was actually saved
      const readResult = await fileService.readFile(testProjectId, 'upload.txt')
      expect(readResult.success).toBe(true)
      expect(readResult.data.content).toBe('uploaded content')
    })

    it('should save uploaded file to custom target path', async () => {
      const mockFile = {
        originalname: 'upload.txt',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('uploaded content')
      } as Express.Multer.File

      const result = await fileService.saveUploadedFile(
        testProjectId, 
        mockFile, 
        'uploads/custom.txt'
      )

      expect(result.success).toBe(true)
      expect(result.data.path).toBe('uploads/custom.txt')

      // Verify file was saved to custom path
      const readResult = await fileService.readFile(testProjectId, 'uploads/custom.txt')
      expect(readResult.success).toBe(true)
    })
  })
})