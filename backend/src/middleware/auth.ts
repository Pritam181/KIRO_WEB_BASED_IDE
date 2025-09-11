import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/user';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  
  if (authReq.isAuthenticated && authReq.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    error: 'Authentication required',
    code: 'AUTH_001'
  });
};

export const optionalAuth = (_req: Request, _res: Response, next: NextFunction) => {
  // This middleware doesn't block the request if user is not authenticated
  // It just adds user info if available
  next();
};

export const requireNoAuth = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  
  if (authReq.isAuthenticated && authReq.isAuthenticated()) {
    return res.status(400).json({
      error: 'Already authenticated',
      code: 'AUTH_002'
    });
  }
  
  return next();
};