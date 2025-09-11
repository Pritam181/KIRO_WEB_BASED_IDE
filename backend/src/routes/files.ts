import express from 'express'
import multer from 'multer'
import { fileService } from '../services/fileService'
import { CreateFileRequest, UpdateFileRequest, MAX_FILES_PER_UPLOAD } from '../types/file'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: MAX_FILES_PER_UPLOAD
  }
})

/**
 * GET /api/files/:projectId/tree
 * Get file tree for a project
 */
router.get('/:projectId/tree', async (req, res) => {
  try {
    const { projectId } = req.params
    const { path: rootPath } = req.query

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    const result = await fileService.generateFileTree(
      projectId, 
      typeof rootPath === 'string' ? rootPath : undefined
    )

    if (result.success) {
      return res.json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/files/:projectId/*
 * Get file content
 */
router.get('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params
    const filePath = (req.params as any)[0] // Get the wildcard path

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      })
    }

    const result = await fileService.readFile(projectId, filePath)

    if (result.success) {
      return res.json(result)
    } else {
      const statusCode = result.message === 'File not found' ? 404 : 400
      return res.status(statusCode).json(result)
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * HEAD /api/files/:projectId/*
 * Check file metadata (for conflict detection)
 */
router.head('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params
    const filePath = (req.params as any)[0] // Get the wildcard path

    if (!projectId || !filePath) {
      return res.status(400).end()
    }

    const result = await fileService.readFile(projectId, filePath)

    if (result.success && result.data) {
      const fileData = result.data as any
      res.set({
        'X-File-Checksum': fileData.checksum,
        'X-File-Size': fileData.size.toString(),
        'X-Last-Modified': fileData.lastModified.toISOString(),
      })
      return res.status(200).end()
    } else {
      const statusCode = result.message === 'File not found' ? 404 : 400
      return res.status(statusCode).end()
    }
  } catch (error) {
    return res.status(500).end()
  }
})

/**
 * POST /api/files/:projectId
 * Create a new file or folder
 */
router.post('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params
    const createRequest: CreateFileRequest = req.body

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    if (!createRequest.path || !createRequest.type) {
      return res.status(400).json({
        success: false,
        message: 'Path and type are required'
      })
    }

    if (!['file', 'folder'].includes(createRequest.type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "file" or "folder"'
      })
    }

    const result = await fileService.createFile(projectId, createRequest)

    if (result.success) {
      return res.status(201).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * PUT /api/files/:projectId/*
 * Update file content
 */
router.put('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params
    const filePath = (req.params as any)[0] // Get the wildcard path
    const { content } = req.body

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      })
    }

    if (typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Content must be a string'
      })
    }

    const updateRequest: UpdateFileRequest = {
      path: filePath,
      content
    }

    const result = await fileService.updateFile(projectId, updateRequest)

    if (result.success) {
      return res.json(result)
    } else {
      const statusCode = result.message === 'File not found' ? 404 : 400
      return res.status(statusCode).json(result)
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * DELETE /api/files/:projectId/*
 * Delete file or folder
 */
router.delete('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params
    const filePath = (req.params as any)[0] // Get the wildcard path

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      })
    }

    const result = await fileService.deleteFile(projectId, filePath)

    if (result.success) {
      return res.json(result)
    } else {
      const statusCode = result.message === 'File or folder not found' ? 404 : 400
      return res.status(statusCode).json(result)
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/files/:projectId/upload
 * Upload files
 */
router.post('/:projectId/upload', upload.array('files', MAX_FILES_PER_UPLOAD), async (req, res) => {
  try {
    const { projectId } = req.params
    const files = req.files as Express.Multer.File[]
    const { targetPath } = req.body

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      })
    }

    const results = []
    const errors = []

    for (const file of files) {
      const result = await fileService.saveUploadedFile(
        projectId, 
        file, 
        targetPath ? `${targetPath}/${file.originalname}` : undefined
      )
      
      if (result.success) {
        results.push(result.data)
      } else {
        errors.push({
          filename: file.originalname,
          error: result.message,
          details: result.data
        })
      }
    }

    if (errors.length === 0) {
      return res.status(201).json({
        success: true,
        message: `${results.length} file(s) uploaded successfully`,
        data: results
      })
    } else if (results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All file uploads failed',
        data: { errors }
      })
    } else {
      return res.status(207).json({ // 207 Multi-Status
        success: true,
        message: `${results.length} file(s) uploaded successfully, ${errors.length} failed`,
        data: {
          uploaded: results,
          errors
        }
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/files/:projectId/upload/single
 * Upload a single file
 */
router.post('/:projectId/upload/single', upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params
    const file = req.file
    const { targetPath } = req.body

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      })
    }

    const result = await fileService.saveUploadedFile(projectId, file, targetPath)

    if (result.success) {
      return res.status(201).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router