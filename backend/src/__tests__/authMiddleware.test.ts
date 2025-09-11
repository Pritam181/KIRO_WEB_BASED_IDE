import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, requireNoAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/user';

describe('Authentication Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('requireAuth', () => {
    it('should call next() for authenticated user', () => {
      mockReq.isAuthenticated = jest.fn().mockReturnValue(true);

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', () => {
      mockReq.isAuthenticated = jest.fn().mockReturnValue(false);

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_001'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when isAuthenticated is undefined', () => {
      mockReq.isAuthenticated = undefined;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_001'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should always call next() regardless of authentication status', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next() for authenticated user', () => {
      mockReq.isAuthenticated = jest.fn().mockReturnValue(true);

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireNoAuth', () => {
    it('should call next() for unauthenticated user', () => {
      mockReq.isAuthenticated = jest.fn().mockReturnValue(false);

      requireNoAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 for authenticated user', () => {
      mockReq.isAuthenticated = jest.fn().mockReturnValue(true);

      requireNoAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Already authenticated',
        code: 'AUTH_002'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when isAuthenticated is undefined', () => {
      mockReq.isAuthenticated = undefined;

      requireNoAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});