import request from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock the AI service
jest.mock('../services/aiService', () => ({
  aiService: {
    processMessage: jest.fn().mockResolvedValue({
      id: 'test-response-id',
      content: 'Test AI response',
      timestamp: new Date(),
      suggestions: [],
    }),
    gatherProjectContext: jest.fn().mockResolvedValue({
      projectId: 'test-project',
      fileCount: 5,
      languages: ['typescript'],
    }),
  },
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

// Mock validation middleware
jest.mock('../middleware/validation', () => ({
  validateRequest: (_schema: any) => (req: any, res: any, next: any) => {
    // Simple validation mock - reject if message is missing or empty
    if (!req.body.message || req.body.message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
      });
    }
    next();
  },
}));

import aiRoutes from '../routes/ai';

describe('AI Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));
    app.use('/api/ai', aiRoutes);
  });

  describe('POST /api/ai/chat', () => {
    it('should process chat message successfully', async () => {
      const chatRequest = {
        message: 'Hello, can you help me?',
        context: {
          projectId: 'test-project',
          currentFile: 'src/App.tsx',
          openFiles: ['src/App.tsx'],
        },
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .send(chatRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data.content).toBe('Test AI response');
    });

    it('should validate request body', async () => {
      const invalidRequest = {
        // Missing required message field
        context: {
          projectId: 'test-project',
        },
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty message', async () => {
      const emptyRequest = {
        message: '',
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .send(emptyRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ai/context/:projectId', () => {
    it('should get project context successfully', async () => {
      const response = await request(app)
        .get('/api/ai/context/test-project')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projectId', 'test-project');
      expect(response.body.data).toHaveProperty('fileCount');
      expect(response.body.data).toHaveProperty('languages');
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/ai/context/test-project')
        .query({ currentFile: 'src/App.tsx' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projectId', 'test-project');
    });
  });

  describe('POST /api/ai/feedback', () => {
    it('should submit feedback successfully', async () => {
      const feedbackRequest = {
        messageId: 'test-message-id',
        feedback: 'up',
        comment: 'Very helpful!',
      };

      const response = await request(app)
        .post('/api/ai/feedback')
        .send(feedbackRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Feedback received');
    });

    it('should handle feedback without comment', async () => {
      const feedbackRequest = {
        messageId: 'test-message-id',
        feedback: 'down',
      };

      const response = await request(app)
        .post('/api/ai/feedback')
        .send(feedbackRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});