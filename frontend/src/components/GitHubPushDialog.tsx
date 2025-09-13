import React, { useState, useEffect } from 'react';
import { GitHubService, GitHubRepository, PushToGitHubRequest } from '../services/githubService';
import { LoadingSpinner } from './LoadingSpinner';

interface GitHubPushDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: Array<{ path: string; content: string }>;
  onPushComplete?: (repositoryUrl: string) => void;
}

export const GitHubPushDialog: React.FC<GitHubPushDialogProps> = ({
  isOpen,
  onClose,
  files,
  onPushComplete
}) => {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [newRepoName, setNewRepoName] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [autoGenerateMessage, setAutoGenerateMessage] = useState<boolean>(true);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [createNewRepo, setCreateNewRepo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [pushing, setPushing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
      if (autoGenerateMessage && files.length > 0) {
        generateCommitMessage();
      }
    }
  }, [isOpen, autoGenerateMessage, files]);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await GitHubService.getUserRepositories(1, 50);
      setRepositories(response.repositories);
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const generateCommitMessage = async () => {
    try {
      const response = await GitHubService.generateCommitMessage(files);
      setCommitMessage(response.message);
    } catch (err: any) {
      console.warn('Failed to generate commit message:', err);
      setCommitMessage('Update files');
    }
  };

  const handlePush = async () => {
    try {
      setPushing(true);
      setError('');

      let targetRepo: GitHubRepository;

      if (createNewRepo) {
        // Create new repository
        if (!newRepoName.trim()) {
          throw new Error('Repository name is required');
        }

        const createResponse = await GitHubService.createRepository({
          name: newRepoName.trim(),
          description: `Project created with Kiro Web IDE`,
          private: isPrivate,
          autoInit: true
        });

        targetRepo = createResponse.repository;
      } else {
        // Use existing repository
        if (!selectedRepo) {
          throw new Error('Please select a repository');
        }

        const [owner, repo] = selectedRepo.split('/');
        const repoResponse = await GitHubService.getRepository(owner, repo);
        targetRepo = repoResponse.repository;
      }

      // Push files to repository
      const [owner, repo] = targetRepo.fullName.split('/');
      const pushRequest: PushToGitHubRequest = {
        owner,
        repo,
        files,
        message: commitMessage.trim() || 'Update files',
        autoGenerateMessage: autoGenerateMessage && !commitMessage.trim()
      };

      const pushResponse = await GitHubService.pushToGitHub(pushRequest);

      // Notify parent component
      if (onPushComplete) {
        onPushComplete(pushResponse.repositoryUrl);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to push to GitHub');
    } finally {
      setPushing(false);
    }
  };

  const handleClose = () => {
    if (!pushing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Push to GitHub
            </h2>
            <button
              onClick={handleClose}
              disabled={pushing}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Repository Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="repoType"
                    checked={!createNewRepo}
                    onChange={() => setCreateNewRepo(false)}
                    disabled={pushing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Use existing repository</span>
                </label>
                
                {!createNewRepo && (
                  <div className="ml-6">
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm text-gray-500">Loading repositories...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        disabled={pushing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select a repository</option>
                        {repositories.map((repo) => (
                          <option key={repo.id} value={repo.fullName}>
                            {repo.fullName} {repo.private && '(Private)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="repoType"
                    checked={createNewRepo}
                    onChange={() => setCreateNewRepo(true)}
                    disabled={pushing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Create new repository</span>
                </label>

                {createNewRepo && (
                  <div className="ml-6 space-y-2">
                    <input
                      type="text"
                      placeholder="Repository name"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      disabled={pushing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        disabled={pushing}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Private repository</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Commit Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commit Message
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoGenerateMessage}
                    onChange={(e) => setAutoGenerateMessage(e.target.checked)}
                    disabled={pushing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-generate commit message</span>
                </label>
                
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  disabled={pushing || autoGenerateMessage}
                  placeholder="Enter commit message..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            {/* File Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Files to Push ({files.length})
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-md p-2">
                {files.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {file.path}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              disabled={pushing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handlePush}
              disabled={pushing || (!selectedRepo && !newRepoName.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              {pushing && <LoadingSpinner size="sm" />}
              <span>{pushing ? 'Pushing...' : 'Push to GitHub'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};