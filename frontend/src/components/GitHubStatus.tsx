import React, { useState, useEffect } from 'react';
import { GitHubService, GitHubUser } from '../services/githubService';

interface GitHubStatusProps {
  className?: string;
}

export const GitHubStatus: React.FC<GitHubStatusProps> = ({ className = '' }) => {
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGitHubUser();
  }, []);

  const loadGitHubUser = async () => {
    try {
      const response = await GitHubService.getGitHubUser();
      setGithubUser(response.user);
    } catch (err) {
      // User not authenticated with GitHub
      setGithubUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">Checking GitHub...</span>
      </div>
    );
  }

  if (!githubUser) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-500">Not connected to GitHub</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <img
        src={githubUser.avatarUrl}
        alt={githubUser.name || githubUser.login}
        className="w-5 h-5 rounded-full"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {githubUser.name || githubUser.login}
      </span>
    </div>
  );
};