import request from 'supertest'
import express from 'express'
import fileRoutes from '../routes/files'

// Mock the file service
jest.mock('../services/fileService')

const app = express()
app.use(express.json())
app.use('/api/files', fileRoutes)

describe('File Routes', () => {
  const mockFileService = {
    generateFileTree: jest.fn(),
    readFile: jest.fn(),
    createFile: jest.fn(),
    updateFile: jest.fn(),
    deleteFile: jest.fn(),
    saveUploadedFile: jest.fn(),
    validateUploadedFile: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Replace the fileService instance with our mock
    require('../services/fileService').fileService = mockFileService
  })

  describe('GET /:projectId/tree', () => {
    it('should return file tree successfully', async () => {
      const mockFileTree = {
        'src/index.ts': { type: 'file', metadata: { size: 100, lastModified: new Date() } },
        'README.md': { type: 'file', metadata: { size: 50, lastModified: new Date() } }
      }

      mockFileService.generateFileTree.mockResolvedValue({
        success: true,
        message: 'File tree generated successfully',
        data: mockFileTree
      })

      const response = await request(app)
        .get('/api/files/test-project/tree')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data['src/index.ts']).toBeDefined()
      expect(response.body.data['README.md']).toBeDefined()
      expect(response.body.data['src/index.ts'].type).toBe('file')
      expect(response.body.data['README.md'].type).toBe('file')
      expect(mockFileService.generateFileTree).toHaveBeenCalledWith('test-project', undefined)
    })

    it('should return file tree with root path', async () => {
      mockFileService.generateFileTree.mockResolvedValue({
        success: true,
        message: 'File tree generated successfully',
        data: {}
      })

      await request(app)
        .get('/api/files/test-project/tree?path=src')
        .expect(200)

      expect(mockFileService.generateFileTree).toHaveBeenCalledWith('test-project', 'src')
    })

    it('should return 400 for missing project ID', async () => {
      await request(app)
        .get('/api/files//tree')
        .expect(404) // Express returns 404 for empty route params
    })

    it('should return 400 for file service error', async () => {
      mockFileService.generateFileTree.mockResolvedValue({
        success: false,
        message: 'Project not found'
      })

      const response = await request(app)
        .get('/api/files/test-project/tree')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Project not found')
    })
  })

  describe('GET /:projectId/*', () => {
    it('should return file content successfully', async () => {
      const mockFileContent = {
        path: 'src/index.ts',
        content: 'export * from "./components"',
        language: 'typescript',
        size: 100,
        lastModified: new Date(),
        checksum: 'abc123'
      }

      mockFileService.readFile.mockResolvedValue({
        success: true,
        message: 'File read successfully',
        data: mockFileContent
      })

      const response = await request(app)
        .get('/api/files/test-project/src/index.ts')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.path).toBe('src/index.ts')
      expect(response.body.data.content).toBe('export * from "./components"')
      expect(response.body.data.language).toBe('typescript')
      expect(response.body.data.size).toBe(100)
      expect(response.body.data.checksum).toBe('abc123')
      expect(mockFileService.readFile).toHaveBeenCalledWith('test-project', 'src/index.ts')
    })

    it('should return 404 for file not found', async () => {
      mockFileService.readFile.mockResolvedValue({
        success: false,
        message: 'File not found'
      })

      const response = await request(app)
        .get('/api/files/test-project/non-existent.txt')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('File not found')
    })

    it('should return 400 for validation error', async () => {
      mockFileService.readFile.mockResolvedValue({
        success: false,
        message: 'Validation failed',
        data: { errors: [{ field: 'path', message: 'Invalid path' }] }
      })

      const response = await request(app)
        .get('/api/files/test-project/../invalid')
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /:projectId', () => {
    it('should create file successfully', async () => {
      const mockFileContent = {
        path: 'new-file.txt',
        content: 'Hello, World!',
        language: 'plaintext',
        size: 13,
        lastModified: new Date(),
        checksum: 'def456'
      }

      mockFileService.createFile.mockResolvedValue({
        success: true,
        message: 'File created successfully',
        data: mockFileContent
      })

      const response = await request(app)
        .post('/api/files/test-project')
        .send({
          path: 'new-file.txt',
          content: 'Hello, World!',
          type: 'file'
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.path).toBe('new-file.txt')
      expect(response.body.data.content).toBe('Hello, World!')
      expect(response.body.data.language).toBe('plaintext')
      expect(response.body.data.size).toBe(13)
      expect(response.body.data.checksum).toBe('def456')
      expect(mockFileService.createFile).toHaveBeenCalledWith('test-project', {
        path: 'new-file.txt',
        content: 'Hello, World!',
        type: 'file'
      })
    })

    it('should create folder successfully', async () => {
      mockFileService.createFile.mockResolvedValue({
        success: true,
        message: 'Folder created successfully'
      })

      const response = await request(app)
        .post('/api/files/test-project')
        .send({
          path: 'new-folder',
          type: 'folder'
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(mockFileService.createFile).toHaveBeenCalledWith('test-project', {
        path: 'new-folder',
        type: 'folder'
      })
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/files/test-project')
        .send({
          path: 'test.txt'
          // missing type
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Path and type are required')
    })

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .post('/api/files/test-project')
        .send({
          path: 'test.txt',
          type: 'invalid'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Type must be either "file" or "folder"')
    })
  })

  describe('PUT /:projectId/*', () => {
    it('should update file successfully', async () => {
      const mockUpdatedFile = {
        path: 'src/index.ts',
        content: 'export * from "./updated"',
        language: 'typescript',
        size: 120,
        lastModified: new Date(),
        checksum: 'ghi789'
      }

      mockFileService.updateFile.mockResolvedValue({
        success: true,
        message: 'File updated successfully',
        data: mockUpdatedFile
      })

      const response = await request(app)
        .put('/api/files/test-project/src/index.ts')
        .send({
          content: 'export * from "./updated"'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.path).toBe('src/index.ts')
      expect(response.body.data.content).toBe('export * from "./updated"')
      expect(response.body.data.language).toBe('typescript')
      expect(response.body.data.size).toBe(120)
      expect(response.body.data.checksum).toBe('ghi789')
      expect(mockFileService.updateFile).toHaveBeenCalledWith('test-project', {
        path: 'src/index.ts',
        content: 'export * from "./updated"'
      })
    })

    it('should return 404 for file not found', async () => {
      mockFileService.updateFile.mockResolvedValue({
        success: false,
        message: 'File not found'
      })

      const response = await request(app)
        .put('/api/files/test-project/non-existent.txt')
        .send({
          content: 'new content'
        })
        .expect(404)

      expect(response.body.success).toBe(false)
    })

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .put('/api/files/test-project/test.txt')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Content must be a string')
    })

    it('should return 400 for non-string content', async () => {
      const response = await request(app)
        .put('/api/files/test-project/test.txt')
        .send({
          content: 123
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Content must be a string')
    })
  })

  describe('DELETE /:projectId/*', () => {
    it('should delete file successfully', async () => {
      mockFileService.deleteFile.mockResolvedValue({
        success: true,
        message: 'File deleted successfully'
      })

      const response = await request(app)
        .delete('/api/files/test-project/test.txt')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('File deleted successfully')
      expect(mockFileService.deleteFile).toHaveBeenCalledWith('test-project', 'test.txt')
    })

    it('should delete folder successfully', async () => {
      mockFileService.deleteFile.mockResolvedValue({
        success: true,
        message: 'Folder deleted successfully'
      })

      const response = await request(app)
        .delete('/api/files/test-project/src')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Folder deleted successfully')
    })

    it('should return 404 for file not found', async () => {
      mockFileService.deleteFile.mockResolvedValue({
        success: false,
        message: 'File or folder not found'
      })

      const response = await request(app)
        .delete('/api/files/test-project/non-existent.txt')
        .expect(404)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /:projectId/upload/single', () => {
    it('should upload single file successfully', async () => {
      const mockUploadedFile = {
        path: 'uploaded.txt',
        content: 'uploaded content',
        language: 'plaintext',
        size: 16,
        lastModified: new Date(),
        checksum: 'jkl012'
      }

      mockFileService.saveUploadedFile.mockResolvedValue({
        success: true,
        message: 'File uploaded successfully',
        data: mockUploadedFile
      })

      const response = await request(app)
        .post('/api/files/test-project/upload/single')
        .attach('file', Buffer.from('uploaded content'), 'uploaded.txt')
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.path).toBe('uploaded.txt')
      expect(response.body.data.content).toBe('uploaded content')
      expect(response.body.data.language).toBe('plaintext')
      expect(response.body.data.size).toBe(16)
      expect(response.body.data.checksum).toBe('jkl012')
      expect(mockFileService.saveUploadedFile).toHaveBeenCalled()
    })

    it('should return 400 for missing file', async () => {
      const response = await request(app)
        .post('/api/files/test-project/upload/single')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('No file provided')
    })

    it('should return 400 for file validation error', async () => {
      mockFileService.saveUploadedFile.mockResolvedValue({
        success: false,
        message: 'File validation failed',
        data: { errors: [{ field: 'size', message: 'File too large' }] }
      })

      const response = await request(app)
        .post('/api/files/test-project/upload/single')
        .attach('file', Buffer.from('content'), 'test.txt')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('File validation failed')
    })
  })

  describe('POST /:projectId/upload', () => {
    it('should upload multiple files successfully', async () => {
      const mockUploadedFiles = [
        {
          path: 'file1.txt',
          content: 'content1',
          language: 'plaintext',
          size: 8,
          lastModified: new Date(),
          checksum: 'abc1'
        },
        {
          path: 'file2.txt',
          content: 'content2',
          language: 'plaintext',
          size: 8,
          lastModified: new Date(),
          checksum: 'abc2'
        }
      ]

      mockFileService.saveUploadedFile
        .mockResolvedValueOnce({
          success: true,
          message: 'File uploaded successfully',
          data: mockUploadedFiles[0]
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'File uploaded successfully',
          data: mockUploadedFiles[1]
        })

      const response = await request(app)
        .post('/api/files/test-project/upload')
        .attach('files', Buffer.from('content1'), 'file1.txt')
        .attach('files', Buffer.from('content2'), 'file2.txt')
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('2 file(s) uploaded successfully')
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].path).toBe('file1.txt')
      expect(response.body.data[1].path).toBe('file2.txt')
    })

    it('should handle partial upload failures', async () => {
      const mockUploadedFile = {
        path: 'file1.txt',
        content: 'content1',
        language: 'plaintext',
        size: 8,
        lastModified: new Date(),
        checksum: 'abc1'
      }

      mockFileService.saveUploadedFile
        .mockResolvedValueOnce({
          success: true,
          message: 'File uploaded successfully',
          data: mockUploadedFile
        })
        .mockResolvedValueOnce({
          success: false,
          message: 'File validation failed',
          data: { errors: [{ field: 'size', message: 'File too large' }] }
        })

      const response = await request(app)
        .post('/api/files/test-project/upload')
        .attach('files', Buffer.from('content1'), 'file1.txt')
        .attach('files', Buffer.from('content2'), 'file2.txt')
        .expect(207) // Multi-Status

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('1 file(s) uploaded successfully, 1 failed')
      expect(response.body.data.uploaded).toHaveLength(1)
      expect(response.body.data.uploaded[0].path).toBe('file1.txt')
      expect(response.body.data.errors).toHaveLength(1)
    })

    it('should return 400 when all uploads fail', async () => {
      mockFileService.saveUploadedFile.mockResolvedValue({
        success: false,
        message: 'File validation failed'
      })

      const response = await request(app)
        .post('/api/files/test-project/upload')
        .attach('files', Buffer.from('content'), 'file.txt')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('All file uploads failed')
    })

    it('should return 400 for no files', async () => {
      const response = await request(app)
        .post('/api/files/test-project/upload')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('No files provided')
    })
  })
})