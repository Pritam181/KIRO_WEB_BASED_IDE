import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/user';
import { GitHubService } from '../services/githubService';
import { validateGitHubPush, validateCreateRepository } from '../validation/github';

const router = Router();

// Middleware to get GitHub access token from user session
const getGitHubToken = (req: AuthenticatedRequest): string | null => {
  // Get the access token from the user object (stored during OAuth)
  return (req.user as any)?.githubAccessToken || null;
};

// Get user's GitHub repositories
router.get('/repositories', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const accessToken = getGitHubToken(authReq);

    if (!accessToken) {
      return res.status(401).json({
        error: 'GitHub access token not found. Please re-authenticate with GitHub.',
        code: 'GITHUB_001'
      });
    }

    const githubService = new GitHubService(accessToken);
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.per_page as string) || 30, 100);

    const repositories = await githubService.getUserRepositories(page, perPage);

    return res.json({
      repositories,
      pagination: {
        page,
        perPage,
        hasMore: repositories.length === perPage
      }
    });
  } catch (error: any) {
    console.error('Error fetching repositories:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch repositories',
      code: 'GITHUB_002'
    });
  }
});

// Create a new repository
router.post('/repositories', requireAuth, validateCreateRepository, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const accessToken = getGitHubToken(authReq);

    if (!accessToken) {
      return res.status(401).json({
        error: 'GitHub access token not found. Please re-authenticate with GitHub.',
        code: 'GITHUB_001'
      });
    }

    const { name, description, private: isPrivate, autoInit } = req.body;
    const githubService = new GitHubService(accessToken);

    const repository = await githubService.createRepository({
      name,
      description,
      private: isPrivate,
      autoInit
    });

    return res.status(201).json({
      repository,
      message: 'Repository created successfully'
    });
  } catch (error: any) {
    console.error('Error creating repository:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'GITHUB_003'
      });
    }

    return res.status(500).json({
      error: error.message || 'Failed to create repository',
      code: 'GITHUB_004'
    });
  }
});

// Get repository information
router.get('/repositories/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const accessToken = getGitHubToken(authReq);

    if (!accessToken) {
      return res.status(401).json({
        error: 'GitHub access token not found. Please re-authenticate with GitHub.',
        code: 'GITHUB_001'
      });
    }

    const { owner, repo } = req.params;
    const githubService = new GitHubService(accessToken);

    const repository = await githubService.getRepository(owner, repo);

    return res.json({ repository });
  } catch (error: any) {
    console.error('Error fetching repository:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'GITHUB_005'
      });
    }

    return res.status(500).json({
      error: error.message || 'Failed to fetch repository',
      code: 'GITHUB_006'
    });
  }
});

// Push files to repository
router.post('/push', requireAuth, validateGitHubPush, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const accessToken = getGitHubToken(authReq);

    if (!accessToken) {
      return res.status(401).json({
        error: 'GitHub access token not found. Please re-authenticate with GitHub.',
        code: 'GITHUB_001'
      });
    }

    const { owner, repo, files, message, branch, autoGenerateMessage } = req.body;
    const githubService = new GitHubService(accessToken);

    // Generate commit message if requested
    const commitMessage = autoGenerateMessage 
      ? GitHubService.generateCommitMessage(files)
      : message;

    const commitSha = await githubService.commitAndPushFiles({
      owner,
      repo,
      files,
      message: commitMessage,
      branch
    });

    // Get repository URL for response
    const repository = await githubService.getRepository(owner, repo);

    return res.json({
      success: true,
      commitSha,
      repositoryUrl: repository.htmlUrl,
      commitMessage,
      message: 'Files pushed successfully to GitHub'
    });
  } catch (error: any) {
    console.error('Error pushing to GitHub:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'GITHUB_007'
      });
    }

    if (error.message.includes('permissions')) {
      return res.status(403).json({
        error: error.message,
        code: 'GITHUB_008'
      });
    }

    return res.status(500).json({
      error: error.message || 'Failed to push files to GitHub',
      code: 'GITHUB_009'
    });
  }
});

// Generate commit message for files
router.post('/generate-commit-message', requireAuth, async (req, res) => {
  try {
    const { files } = req.body;

    if (!Array.isArray(files)) {
      return res.status(400).json({
        error: 'Files must be an array',
        code: 'GITHUB_010'
      });
    }

    const message = GitHubService.generateCommitMessage(files);

    return res.json({
      message,
      fileCount: files.length
    });
  } catch (error: any) {
    console.error('Error generating commit message:', error);
    return res.status(500).json({
      error: 'Failed to generate commit message',
      code: 'GITHUB_011'
    });
  }
});

// Get authenticated GitHub user info
router.get('/user', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const accessToken = getGitHubToken(authReq);

    if (!accessToken) {
      return res.status(401).json({
        error: 'GitHub access token not found. Please re-authenticate with GitHub.',
        code: 'GITHUB_001'
      });
    }

    const githubService = new GitHubService(accessToken);
    const githubUser = await githubService.getAuthenticatedUser();

    return res.json({
      user: {
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        htmlUrl: githubUser.html_url,
        publicRepos: githubUser.public_repos,
        privateRepos: githubUser.total_private_repos
      }
    });
  } catch (error: any) {
    console.error('Error fetching GitHub user:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch GitHub user information',
      code: 'GITHUB_012'
    });
  }
});

export default router;