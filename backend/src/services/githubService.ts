import { Octokit } from '@octokit/rest';
import { User } from '../types/user';

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

export interface CreateRepositoryOptions {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
}

export interface CommitAndPushOptions {
  owner: string;
  repo: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  message: string;
  branch?: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: 'Kiro-Web-IDE/1.0.0',
    });
  }

  /**
   * Create a new GitHub client with user's access token
   */
  static createForUser(_user: User, accessToken: string): GitHubService {
    return new GitHubService(accessToken);
  }

  /**
   * Get authenticated user's repositories
   */
  async getUserRepositories(page = 1, perPage = 30): Promise<GitHubRepository[]> {
    try {
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        defaultBranch: repo.default_branch,
        createdAt: repo.created_at || '',
        updatedAt: repo.updated_at || '',
        pushedAt: repo.pushed_at,
      }));
    } catch (error) {
      console.error('Error fetching user repositories:', error);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(options: CreateRepositoryOptions): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: options.name,
        description: options.description,
        private: options.private ?? false,
        auto_init: options.autoInit ?? true,
      });

      const repo = response.data;
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        defaultBranch: repo.default_branch,
        createdAt: repo.created_at || '',
        updatedAt: repo.updated_at || '',
        pushedAt: repo.pushed_at,
      };
    } catch (error: any) {
      console.error('Error creating repository:', error);
      if (error.status === 422) {
        throw new Error('Repository name already exists or is invalid');
      }
      throw new Error('Failed to create repository on GitHub');
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const repoData = response.data;
      return {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        private: repoData.private,
        htmlUrl: repoData.html_url,
        cloneUrl: repoData.clone_url,
        sshUrl: repoData.ssh_url,
        defaultBranch: repoData.default_branch,
        createdAt: repoData.created_at || '',
        updatedAt: repoData.updated_at || '',
        pushedAt: repoData.pushed_at,
      };
    } catch (error: any) {
      console.error('Error fetching repository:', error);
      if (error.status === 404) {
        throw new Error('Repository not found');
      }
      throw new Error('Failed to fetch repository information');
    }
  }

  /**
   * Commit and push files to a repository
   */
  async commitAndPushFiles(options: CommitAndPushOptions): Promise<string> {
    const { owner, repo, files, message, branch = 'main' } = options;

    try {
      // Get the current commit SHA
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      const currentCommitSha = refData.object.sha;

      // Get the current tree
      const { data: currentCommit } = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
      });

      const currentTreeSha = currentCommit.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: Buffer.from(file.content, 'utf8').toString('base64'),
            encoding: 'base64',
          });
          return {
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create new tree
      const { data: newTree } = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: blobs,
      });

      // Create new commit
      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [currentCommitSha],
      });

      // Update the reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      return newCommit.sha;
    } catch (error: any) {
      console.error('Error committing and pushing files:', error);
      if (error.status === 404) {
        throw new Error('Repository or branch not found');
      }
      if (error.status === 403) {
        throw new Error('Insufficient permissions to push to repository');
      }
      throw new Error('Failed to commit and push files to GitHub');
    }
  }

  /**
   * Generate a commit message based on file changes
   */
  static generateCommitMessage(files: Array<{ path: string; content: string }>): string {
    if (files.length === 0) {
      return 'Empty commit';
    }

    if (files.length === 1) {
      const file = files[0];
      const fileName = file.path.split('/').pop() || file.path;
      return `Update ${fileName}`;
    }

    const fileTypes = new Set(
      files.map(file => {
        const ext = file.path.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'js':
          case 'ts':
          case 'jsx':
          case 'tsx':
            return 'JavaScript/TypeScript';
          case 'py':
            return 'Python';
          case 'java':
            return 'Java';
          case 'cpp':
          case 'c':
          case 'h':
            return 'C/C++';
          case 'css':
          case 'scss':
          case 'sass':
            return 'styles';
          case 'html':
            return 'HTML';
          case 'md':
            return 'documentation';
          case 'json':
            return 'configuration';
          default:
            return 'files';
        }
      })
    );

    if (fileTypes.size === 1) {
      const type = Array.from(fileTypes)[0];
      return `Update ${type} files (${files.length} files)`;
    }

    return `Update multiple files (${files.length} files)`;
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return response.data;
    } catch (error) {
      console.error('Error fetching authenticated user:', error);
      throw new Error('Failed to fetch user information from GitHub');
    }
  }
}