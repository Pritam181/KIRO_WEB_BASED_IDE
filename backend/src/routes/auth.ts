import { Router } from 'express';
import passport from '../config/passport';
import { requireAuth, requireNoAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/user';
import { config } from '../config/environment';

const router = Router();

// GitHub OAuth login
router.get('/github', requireNoAuth, (req, res, next) => {
  if (!config.github.clientId || !config.github.clientSecret) {
    return res.redirect(`${config.frontendUrl}/login?error=oauth_not_configured`);
  }
  passport.authenticate('github', {
    scope: ['user:email']
  })(req, res, next);
});

// GitHub OAuth callback
router.get('/github/callback', (req, res, next) => {
  if (!config.github.clientId || !config.github.clientSecret) {
    return res.redirect(`${config.frontendUrl}/login?error=oauth_not_configured`);
  }
  passport.authenticate('github', { 
    failureRedirect: `${config.frontendUrl}/login?error=auth_failed`,
    successRedirect: `${config.frontendUrl}/auth/callback`
  })(req, res, next);
});

// Get current user info
router.get('/user', requireAuth, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  res.json({
    user: authReq.user,
    authenticated: true
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const isAuthenticated = authReq.isAuthenticated && authReq.isAuthenticated();
  
  res.json({
    authenticated: isAuthenticated,
    user: isAuthenticated ? authReq.user : null
  });
});

// Logout
router.post('/logout', requireAuth, (req, res) => {
  (req as any).logout((err: any) => {
    if (err) {
      return res.status(500).json({
        error: 'Logout failed',
        code: 'AUTH_003'
      });
    }
    
    return res.json({
      message: 'Logged out successfully',
      authenticated: false
    });
  });
});

// Login page redirect (for direct access)
router.get('/login', requireNoAuth, (_req, res) => {
  res.redirect('/auth/github');
});

// Demo login for testing (remove in production)
router.post('/demo-login', (req, res) => {
  // Create a demo user session
  const demoUser = {
    id: 'demo-user-123',
    githubId: 'demo-github-id',
    username: 'demo-user',
    email: 'demo@example.com',
    avatarUrl: 'https://github.com/identicons/demo-user.png',
    createdAt: new Date(),
    lastLoginAt: new Date()
  };

  // Manually set user in session (bypassing passport)
  (req as any).login(demoUser, (err: any) => {
    if (err) {
      return res.status(500).json({
        error: 'Demo login failed',
        code: 'DEMO_001'
      });
    }
    
    return res.json({
      message: 'Demo login successful',
      user: demoUser,
      authenticated: true
    });
  });
});

// Direct demo access - bypasses login entirely
router.get('/demo-access', (_req, res) => {
  // Redirect directly to workspace for demo
  res.redirect(`${config.frontendUrl}/workspace?demo=true`);
});

export default router;