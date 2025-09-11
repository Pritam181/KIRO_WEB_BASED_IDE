import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import session from 'express-session'
import passport from './config/passport'
import { config, validateConfig } from './config/environment'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { createRateLimit } from './middleware/rateLimiter'
import authRoutes from './routes/auth'
import fileRoutes from './routes/files'
// import projectRoutes from './routes/projects'
import { fileService } from './services/fileService'
// import { projectService } from './services/projectService'

// Validate configuration
validateConfig()

const app = express()

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// Rate limiting
app.use('/api', createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests from this IP'
}))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv
  })
})

// API status endpoint
app.get('/api/status', (_req, res) => {
  res.json({ 
    message: 'Kiro Web API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  })
})

// Authentication routes
app.use('/auth', authRoutes)

// File management routes
app.use('/api/files', fileRoutes)

// Project management routes (temporarily disabled for demo)
// app.use('/api/projects', projectRoutes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

app.listen(config.port, async () => {
  // Initialize services
  try {
    await fileService.initialize()
    console.log('📁 File service initialized')
    
    // await projectService.initialize()
    // console.log('📁 Project service initialized')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
  }

  console.log(`🚀 Kiro Web API server running on port ${config.port}`)
  console.log(`📊 Health check: http://localhost:${config.port}/health`)
  console.log(`🌍 Environment: ${config.nodeEnv}`)
})