import React, { useState } from 'react';
import { AlertTriangle, FileText, Clock, User } from 'lucide-react';

export interface ConflictResolutionProps {
  fileName: string;
  localContent: string;
  serverContent: string;
  onResolve: (resolution: 'local' | 'server' | 'merge', content?: string) => void;
  onCancel: () => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionProps> = ({
  fileName,
  localContent,
  serverContent,
  onResolve,
  onCancel,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('local');
  const [mergedContent, setMergedContent] = useState<string>(localContent);
  const [showDiff, setShowDiff] = useState<boolean>(false);

  const handleResolve = () => {
    if (selectedResolution === 'merge') {
      onResolve(selectedResolution, mergedContent);
    } else {
      onResolve(selectedResolution);
    }
  };

  const getDiffLines = () => {
    const localLines = localContent.split('\n');
    const serverLines = serverContent.split('\n');
    const maxLines = Math.max(localLines.length, serverLines.length);
    const diff: Array<{ line: number; local?: string; server?: string; type: 'same' | 'different' | 'added' | 'removed' }> = [];

    for (let i = 0; i < maxLines; i++) {
      const localLine = localLines[i];
      const serverLine = serverLines[i];

      if (localLine === undefined && serverLine !== undefined) {
        diff.push({ line: i + 1, server: serverLine, type: 'added' });
      } else if (localLine !== undefined && serverLine === undefined) {
        diff.push({ line: i + 1, local: localLine, type: 'removed' });
      } else if (localLine !== serverLine) {
        diff.push({ line: i + 1, local: localLine, server: serverLine, type: 'different' });
      } else {
        diff.push({ line: i + 1, local: localLine, server: serverLine, type: 'same' });
      }
    }

    return diff;
  };

  const diffLines = getDiffLines();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                File Conflict Detected
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The file "{fileName}" has been modified by another user. Choose how to resolve this conflict.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Resolution Options */}
          <div className="space-y-4 mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Choose Resolution:
            </h3>

            <div className="space-y-3">
              {/* Keep Local Changes */}
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="resolution"
                  value="local"
                  checked={selectedResolution === 'local'}
                  onChange={(e) => setSelectedResolution(e.target.value as 'local')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Keep My Changes
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Overwrite the server version with your local changes.
                  </p>
                </div>
              </label>

              {/* Keep Server Changes */}
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="resolution"
                  value="server"
                  checked={selectedResolution === 'server'}
                  onChange={(e) => setSelectedResolution(e.target.value as 'server')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Keep Server Changes
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Discard your changes and use the server version.
                  </p>
                </div>
              </label>

              {/* Manual Merge */}
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedResolution === 'merge'}
                  onChange={(e) => setSelectedResolution(e.target.value as 'merge')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Manual Merge
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manually combine both versions of the file.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Diff View Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showDiff ? 'Hide' : 'Show'} Differences
            </button>
          </div>

          {/* Diff View */}
          {showDiff && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                File Differences:
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-red-600 dark:text-red-400">Your Version</div>
                    <div className="text-green-600 dark:text-green-400">Server Version</div>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {diffLines.map((diff, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-2 gap-4 px-3 py-1 text-xs font-mono ${
                        diff.type === 'different'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20'
                          : diff.type === 'added'
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : diff.type === 'removed'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : ''
                      }`}
                    >
                      <div className="text-gray-700 dark:text-gray-300">
                        {diff.local || ''}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        {diff.server || ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual Merge Editor */}
          {selectedResolution === 'merge' && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Merged Content:
              </h4>
              <textarea
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                className="w-full h-60 p-3 border rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Edit the merged content here..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Manually edit the content to combine both versions as needed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};