import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3008',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // GitHub OAuth
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5001/auth/github/callback'
  },

  // Session & JWT
  sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',

  // Cloud Storage
  cloudStorage: {
    provider: process.env.CLOUD_STORAGE_PROVIDER || 'local', // 'aws' or 'local'
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || 'kiro-web-files'
    }
  },

  // AI Service
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY || ''
  },

  // Data Directory
  dataDir: process.env.DATA_DIR || './data'
}

// Validate required environment variables in production
export const validateConfig = () => {
  if (config.nodeEnv === 'production') {
    const required = [
      'SESSION_SECRET',
      'JWT_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET'
    ]

    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }
}