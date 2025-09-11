import request from 'supertest'
import express from 'express'
import { errorHandler, notFoundHandler } from '../middleware/errorHandler'

// Create test app
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  
  // Test routes
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })
  
  app.get('/api/status', (_req, res) => {
    res.json({ message: 'Test API running' })
  })
  
  app.get('/error', (_req, _res, next) => {
    const error = new Error('Test error')
    next(error)
  })
  
  // Error handling
  app.use(notFoundHandler)
  app.use(errorHandler)
  
  return app
}

describe('Server Endpoints', () => {
  const app = createTestApp()

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('GET /api/status', () => {
    it('should return API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Test API running')
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('status', 404)
    })

    it('should handle server errors', async () => {
      const response = await request(app)
        .get('/error')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('message', 'Test error')
    })
  })
})