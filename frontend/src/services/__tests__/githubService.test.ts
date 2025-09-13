import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubService } from '../githubService';
import { apiClient } from '../../utils/apiClient';

// Mock the apiClient
vi.mock('../../utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('GitHubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRepositories', () => {
    it('should fetch user repositories', async () => {
      const mockResponse = {
        data: {
          repositories: [
            {
              id: 1,
              name: 'test-repo',
              fullName: 'user/test-repo',
              description: 'Test repository',
              private: false,
              htmlUrl: 'https://github.com/user/test-repo',
              cloneUrl: 'https://github.com/user/test-repo.git',
              sshUrl: 'git@github.com:user/test-repo.git',
              defaultBranch: 'main',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-02T00:00:00Z',
              pushedAt: '2023-01-02T00:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            perPage: 30,
            hasMore: false,
          },
        },
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await GitHubService.getUserRepositories();

      expect(apiClient.get).toHaveBeenCalledWith('/api/github/repositories', {
        params: { page: 1, per_page: 30 },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createRepository', () => {
    it('should create a new repository', async () => {
      const mockResponse = {
        data: {
          repository: {
            id: 1,
            name: 'new-repo',
            fullName: 'user/new-repo',
            description: 'New repository',
            private: false,
            htmlUrl: 'https://github.com/user/new-repo',
            cloneUrl: 'https://github.com/user/new-repo.git',
            sshUrl: 'git@github.com:user/new-repo.git',
            defaultBranch: 'main',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            pushedAt: null,
          },
          message: 'Repository created successfully',
        },
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const request = {
        name: 'new-repo',
        description: 'New repository',
        private: false,
      };

      const result = await GitHubService.createRepository(request);

      expect(apiClient.post).toHaveBeenCalledWith('/api/github/repositories', request);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('pushToGitHub', () => {
    it('should push files to GitHub', async () => {
      const mockResponse = {
        data: {
          success: true,
          commitSha: 'abc123',
          repositoryUrl: 'https://github.com/user/test-repo',
          commitMessage: 'Update files',
          message: 'Files pushed successfully to GitHub',
        },
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const request = {
        owner: 'user',
        repo: 'test-repo',
        files: [
          { path: 'src/index.js', content: 'console.log("Hello World");' },
        ],
        message: 'Update files',
      };

      const result = await GitHubService.pushToGitHub(request);

      expect(apiClient.post).toHaveBeenCalledWith('/api/github/push', request);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message', async () => {
      const mockResponse = {
        data: {
          message: 'Update JavaScript/TypeScript files (2 files)',
          fileCount: 2,
        },
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const files = [
        { path: 'src/index.js', content: 'code' },
        { path: 'src/utils.js', content: 'code' },
      ];

      const result = await GitHubService.generateCommitMessage(files);

      expect(apiClient.post).toHaveBeenCalledWith('/api/github/generate-commit-message', { files });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getGitHubUser', () => {
    it('should fetch GitHub user info', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 12345,
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            avatarUrl: 'https://github.com/avatars/testuser.png',
            htmlUrl: 'https://github.com/testuser',
            publicRepos: 10,
            privateRepos: 5,
          },
        },
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await GitHubService.getGitHubUser();

      expect(apiClient.get).toHaveBeenCalledWith('/api/github/user');
      expect(result).toEqual(mockResponse.data);
    });
  });
});