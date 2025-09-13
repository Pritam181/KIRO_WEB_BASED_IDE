import { useState, useEffect, useCallback } from 'react';
import { GitHubService, GitHubRepository, GitHubUser } from '../services/githubService';

export interface UseGitHubReturn {
  user: GitHubUser | null;
  repositories: GitHubRepository[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  refreshRepositories: () => Promise<void>;
  createRepository: (name: string, options?: { description?: string; private?: boolean }) => Promise<GitHubRepository>;
  pushFiles: (
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>,
    options?: { message?: string; autoGenerateMessage?: boolean }
  ) => Promise<{ repositoryUrl: string; commitSha: string }>;
}

export const useGitHub = (): UseGitHubReturn => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await GitHubService.getGitHubUser();
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setUser(null);
      setIsAuthenticated(false);
      if (!err.message?.includes('GitHub access token not found')) {
        setError(err.message || 'Failed to load GitHub user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRepositories = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const response = await GitHubService.getUserRepositories(1, 100);
      setRepositories(response.repositories);
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createRepository = useCallback(async (
    name: string,
    options: { description?: string; private?: boolean } = {}
  ): Promise<GitHubRepository> => {
    try {
      setLoading(true);
      setError(null);
      const response = await GitHubService.createRepository({
        name,
        description: options.description,
        private: options.private ?? false,
        autoInit: true
      });
      
      // Refresh repositories list
      await refreshRepositories();
      
      return response.repository;
    } catch (err: any) {
      setError(err.message || 'Failed to create repository');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRepositories]);

  const pushFiles = useCallback(async (
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>,
    options: { message?: string; autoGenerateMessage?: boolean } = {}
  ): Promise<{ repositoryUrl: string; commitSha: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await GitHubService.pushToGitHub({
        owner,
        repo,
        files,
        message: options.message,
        autoGenerateMessage: options.autoGenerateMessage ?? false
      });
      
      return {
        repositoryUrl: response.repositoryUrl,
        commitSha: response.commitSha
      };
    } catch (err: any) {
      setError(err.message || 'Failed to push files');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Load repositories when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshRepositories();
    }
  }, [isAuthenticated, refreshRepositories]);

  return {
    user,
    repositories,
    loading,
    error,
    isAuthenticated,
    refreshUser,
    refreshRepositories,
    createRepository,
    pushFiles
  };
};