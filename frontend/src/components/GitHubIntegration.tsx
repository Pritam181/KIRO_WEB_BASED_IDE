import React, { useState, useEffect } from 'react';
import { GitHubPushDialog } from './GitHubPushDialog';
import { GitHubService, GitHubUser } from '../services/githubService';
import { fileService } from '../services/fileService';
import { LoadingSpinner } from './LoadingSpinner';

interface GitHubIntegrationProps {
  className?: string;
}

export const GitHubIntegration: React.FC<GitHubIntegrationProps> = ({ className = '' }) => {
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pushSuccess, setPushSuccess] = useState<string>('');
  const [filesToPush, setFilesToPush] = useState<Array<{ path: string; content: string }>>([]);

  useEffect(() => {
    loadGitHubUser();
  }, []);

  const loadGitHubUser = async () => {
    try {
      setLoading(true);
      const response = await GitHubService.getGitHubUser();
      setGithubUser(response.user);
      setError('');
    } catch (err: any) {
      // User might not be authenticated with GitHub
      setGithubUser(null);
      if (!err.message.includes('GitHub access token not found')) {
        setError(err.message || 'Failed to load GitHub user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePushClick = async () => {
    try {
      setError('');
      setPushSuccess('');
      
      // Get all files from the current project
      const fileTree = await fileService.getFileTree();
      const files: Array<{ path: string; content: string }> = [];

      // Recursively collect all files
      const collectFiles = async (tree: any, basePath = '') => {
        for (const [name, item] of Object.entries(tree)) {
          const fullPath = basePath ? `${basePath}/${name}` : name;
          
          if ((item as any).type === 'file') {
            try {
              const content = await fileService.getFileContent(fullPath);
              files.push({ path: fullPath, content });
            } catch (err) {
              console.warn(`Failed to read file ${fullPath}:`, err);
            }
          } else if ((item as any).type === 'folder' && (item as any).children) {
            await collectFiles((item as any).children, fullPath);
          }
        }
      };

      await collectFiles(fileTree);

      if (files.length === 0) {
        setError('No files found to push');
        return;
      }

      setFilesToPush(files);
      setShowPushDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to prepare files for push');
    }
  };

  const handlePushComplete = (repositoryUrl: string) => {
    setPushSuccess(`Successfully pushed to ${repositoryUrl}`);
    setTimeout(() => setPushSuccess(''), 5000); // Clear success message after 5 seconds
  };

  const handleAuthenticateGitHub = () => {
    // Redirect to GitHub OAuth
    window.location.href = '/auth/github';
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-500">Loading GitHub...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {pushSuccess && (
        <div className="mb-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
          {pushSuccess}
        </div>
      )}

      {githubUser ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <img
              src={githubUser.avatarUrl}
              alt={githubUser.name || githubUser.login}
              className="w-6 h-6 rounded-full"
            />
            <span>Connected as {githubUser.name || githubUser.login}</span>
          </div>
          
          <button
            onClick={handlePushClick}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            <span>Push to GitHub</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleAuthenticateGitHub}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
          </svg>
          <span>Connect to GitHub</span>
        </button>
      )}

      <GitHubPushDialog
        isOpen={showPushDialog}
        onClose={() => setShowPushDialog(false)}
        files={filesToPush}
        onPushComplete={handlePushComplete}
      />
    </div>
  );
};