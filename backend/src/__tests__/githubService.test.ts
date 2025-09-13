import { GitHubService } from '../services/githubService';

// Mock the Octokit module
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listForAuthenticatedUser: jest.fn(),
        createForAuthenticatedUser: jest.fn(),
        get: jest.fn(),
      },
      git: {
        getRef: jest.fn(),
        getCommit: jest.fn(),
        createBlob: jest.fn(),
        createTree: jest.fn(),
        createCommit: jest.fn(),
        updateRef: jest.fn(),
      },
      users: {
        getAuthenticated: jest.fn(),
      },
    },
  })),
}));

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockOctokit: any;

  beforeEach(() => {
    githubService = new GitHubService('mock-token');
    mockOctokit = (githubService as any).octokit;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRepositories', () => {
    it('should fetch user repositories successfully', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'test-repo',
          full_name: 'user/test-repo',
          description: 'Test repository',
          private: false,
          html_url: 'https://github.com/user/test-repo',
          clone_url: 'https://github.com/user/test-repo.git',
          ssh_url: 'git@github.com:user/test-repo.git',
          default_branch: 'main',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          pushed_at: '2023-01-02T00:00:00Z',
        },
      ];

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      });

      const result = await githubService.getUserRepositories();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
      });

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        page: 1,
        per_page: 30,
        sort: 'updated',
        direction: 'desc',
      });
    });

    it('should handle API errors', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(
        new Error('API Error')
      );

      await expect(githubService.getUserRepositories()).rejects.toThrow(
        'Failed to fetch repositories from GitHub'
      );
    });
  });

  describe('createRepository', () => {
    it('should create a repository successfully', async () => {
      const mockRepo = {
        id: 1,
        name: 'new-repo',
        full_name: 'user/new-repo',
        description: 'New repository',
        private: false,
        html_url: 'https://github.com/user/new-repo',
        clone_url: 'https://github.com/user/new-repo.git',
        ssh_url: 'git@github.com:user/new-repo.git',
        default_branch: 'main',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        pushed_at: null,
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo,
      });

      const result = await githubService.createRepository({
        name: 'new-repo',
        description: 'New repository',
        private: false,
      });

      expect(result).toEqual({
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
      });

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'new-repo',
        description: 'New repository',
        private: false,
        auto_init: true,
      });
    });

    it('should handle repository name conflicts', async () => {
      const error = new Error('Repository already exists');
      (error as any).status = 422;
      mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue(error);

      await expect(
        githubService.createRepository({ name: 'existing-repo' })
      ).rejects.toThrow('Repository name already exists or is invalid');
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate message for single file', () => {
      const files = [{ path: 'src/index.js', content: 'console.log("hello");' }];
      const message = GitHubService.generateCommitMessage(files);
      expect(message).toBe('Update index.js');
    });

    it('should generate message for multiple files of same type', () => {
      const files = [
        { path: 'src/index.js', content: 'code' },
        { path: 'src/utils.js', content: 'code' },
      ];
      const message = GitHubService.generateCommitMessage(files);
      expect(message).toBe('Update JavaScript/TypeScript files (2 files)');
    });

    it('should generate message for multiple files of different types', () => {
      const files = [
        { path: 'src/index.js', content: 'code' },
        { path: 'styles/main.css', content: 'styles' },
        { path: 'README.md', content: 'docs' },
      ];
      const message = GitHubService.generateCommitMessage(files);
      expect(message).toBe('Update multiple files (3 files)');
    });

    it('should handle empty files array', () => {
      const message = GitHubService.generateCommitMessage([]);
      expect(message).toBe('Empty commit');
    });
  });

  describe('commitAndPushFiles', () => {
    it('should commit and push files successfully', async () => {
      // Mock the Git API calls
      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'current-commit-sha' } },
      });

      mockOctokit.rest.git.getCommit.mockResolvedValue({
        data: { tree: { sha: 'current-tree-sha' } },
      });

      mockOctokit.rest.git.createBlob.mockResolvedValue({
        data: { sha: 'blob-sha' },
      });

      mockOctokit.rest.git.createTree.mockResolvedValue({
        data: { sha: 'new-tree-sha' },
      });

      mockOctokit.rest.git.createCommit.mockResolvedValue({
        data: { sha: 'new-commit-sha' },
      });

      mockOctokit.rest.git.updateRef.mockResolvedValue({});

      const files = [{ path: 'test.txt', content: 'Hello World' }];
      const result = await githubService.commitAndPushFiles({
        owner: 'user',
        repo: 'test-repo',
        files,
        message: 'Test commit',
      });

      expect(result).toBe('new-commit-sha');
      expect(mockOctokit.rest.git.createBlob).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'test-repo',
        content: Buffer.from('Hello World', 'utf8').toString('base64'),
        encoding: 'base64',
      });
    });

    it('should handle repository not found error', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      mockOctokit.rest.git.getRef.mockRejectedValue(error);

      await expect(
        githubService.commitAndPushFiles({
          owner: 'user',
          repo: 'nonexistent',
          files: [{ path: 'test.txt', content: 'content' }],
          message: 'Test',
        })
      ).rejects.toThrow('Repository or branch not found');
    });
  });
});