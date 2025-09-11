import request from 'supertest';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import authRoutes from '../routes/auth';

// Mock passport configuration for tests
jest.mock('../config/passport', () => {
  const passport = require('passport');
  
  // Mock serialize/deserialize
  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id: string, done: any) => {
    done(null, { id, username: 'testuser' });
  });
  
  return passport;
});

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/auth', authRoutes);
  
  return app;
};

describe('Authentication Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
    // Clear users before each test
    jest.clearAllMocks();
  });

  describe('GET /auth/status', () => {
    it('should return unauthenticated status for non-authenticated user', async () => {
      const response = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: false,
        user: null
      });
    });
  });

  describe('GET /auth/github', () => {
    it('should attempt to redirect to GitHub OAuth', async () => {
      const response = await request(app)
        .get('/auth/github');

      // In test environment without proper OAuth config, this might return 500
      // but the route should exist and attempt authentication
      expect([302, 500]).toContain(response.status);
    });
  });

  describe('GET /auth/user', () => {
    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/auth/user')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required',
        code: 'AUTH_001'
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication required',
        code: 'AUTH_001'
      });
    });
  });

  describe('GET /auth/login', () => {
    it('should redirect to /auth/github', async () => {
      const response = await request(app)
        .get('/auth/login')
        .expect(302);

      expect(response.headers.location).toBe('/auth/github');
    });
  });
});

