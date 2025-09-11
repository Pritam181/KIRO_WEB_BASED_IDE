import request from 'supertest'
import express from 'express'
import { createRateLimit } from '../middleware/rateLimiter'
import { validateBody } from '../middleware/validation'
import Joi from 'joi'

describe('Middleware Tests', () => {
  describe('Rate Limiter', () => {
    it('should allow requests within limit', async () => {
      const app = express()
      app.use(createRateLimit({ windowMs: 60000, max: 5 }))
      app.get('/test', (_req, res) => res.json({ success: true }))

      const response = await request(app)
        .get('/test')
        .expect(200)

      expect(response.headers).toHaveProperty('x-ratelimit-limit', '5')
      expect(response.headers).toHaveProperty('x-ratelimit-remaining', '4')
    })

    it('should block requests exceeding limit', async () => {
      // Create a fresh app for this test to avoid interference
      const app = express()
      app.use(createRateLimit({ windowMs: 1000, max: 1 }))
      app.get('/test-limit', (_req, res) => res.json({ success: true }))

      // First request should succeed
      const firstResponse = await request(app).get('/test-limit')
      expect(firstResponse.status).toBe(200)

      // Second request should be rate limited
      const secondResponse = await request(app).get('/test-limit')
      expect(secondResponse.status).toBe(429)
      expect(secondResponse.body.error).toHaveProperty('status', 429)
    })
  })

  describe('Validation Middleware', () => {
    it('should validate request body', async () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required()
      })

      const app = express()
      app.use(express.json())
      app.post('/test', validateBody(schema), (_req, res) => {
        res.json({ success: true })
      })

      // Add error handler
      app.use((err: any, _req: any, res: any, _next: any) => {
        res.status(err.statusCode || 500).json({
          error: {
            message: err.message,
            status: err.statusCode || 500
          }
        })
      })

      // Valid request
      await request(app)
        .post('/test')
        .send({ name: 'John', email: 'john@example.com' })
        .expect(200)

      // Invalid request
      const response = await request(app)
        .post('/test')
        .send({ name: 'John' }) // missing email
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('status', 400)
    })
  })
})