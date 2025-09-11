import { Request, Response, NextFunction } from 'express'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export const createRateLimit = (options: {
  windowMs: number
  max: number
  message?: string
}) => {
  const { windowMs, max, message = 'Too many requests' } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    
    // Clean up expired entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key]
    }

    // Initialize or increment counter
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      }
    } else {
      store[key].count++
    }

    // Check if limit exceeded
    if (store[key].count > max) {
      return res.status(429).json({
        error: {
          message,
          status: 429,
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
        }
      })
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - store[key].count).toString(),
      'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString()
    })

    return next()
  }
}