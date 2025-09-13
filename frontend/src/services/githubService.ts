import { apiClient } from '../utils/apiClient';

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

export interface CreateRepositoryRequest {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
}

export interface PushToGitHubRequest {
  owner: string;
  repo: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  message?: string;
  branch?: string;
  autoGenerateMessage?: boolean;
}

export interface PushToGitHubResponse {
  success: boolean;
  commitSha: string;
  repositoryUrl: string;
  commitMessage: string;
  message: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  privateRepos: number;
}

export class GitHubService {
  /**
   * Get user's GitHub repositories
   */
  static async getUserRepositories(page = 1, perPage = 30): Promise<{
    repositories: GitHubRepository[];
    pagination: {
      page: number;
      perPage: number;
      hasMore: boolean;
    };
  }> {
    const response = await apiClient.get('/api/github/repositories', {
      params: { page, per_page: perPage }
    });
    return response.data;
  }

  /**
   * Create a new repository
   */
  static async createRepository(request: CreateRepositoryRequest): Promise<{
    repository: GitHubRepository;
    message: string;
  }> {
    const response = await apiClient.post('/api/github/repositories', request);
    return response.data;
  }

  /**
   * Get repository information
   */
  static async getRepository(owner: string, repo: string): Promise<{
    repository: GitHubRepository;
  }> {
    const response = await apiClient.get(`/api/github/repositories/${owner}/${repo}`);
    return response.data;
  }

  /**
   * Push files to GitHub repository
   */
  static async pushToGitHub(request: PushToGitHubRequest): Promise<PushToGitHubResponse> {
    const response = await apiClient.post('/api/github/push', request);
    return response.data;
  }

  /**
   * Generate commit message for files
   */
  static async generateCommitMessage(files: Array<{ path: string; content: string }>): Promise<{
    message: string;
    fileCount: number;
  }> {
    const response = await apiClient.post('/api/github/generate-commit-message', { files });
    return response.data;
  }

  /**
   * Get authenticated GitHub user info
   */
  static async getGitHubUser(): Promise<{
    user: GitHubUser;
  }> {
    const response = await apiClient.get('/api/github/user');
    return response.data;
  }
}