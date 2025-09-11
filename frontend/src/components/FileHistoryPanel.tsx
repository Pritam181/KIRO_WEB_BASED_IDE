import React, { useState, useEffect } from 'react';
import { History, Clock, RotateCcw, Eye, Trash2, Download } from 'lucide-react';
import { fileHistoryService, FileVersion, FileHistory } from '../services/fileHistoryService';

export interface FileHistoryPanelProps {
  projectId: string;
  filePath: string;
  onRestoreVersion: (content: string) => void;
  onClose: () => void;
}

export const FileHistoryPanel: React.FC<FileHistoryPanelProps> = ({
  projectId,
  filePath,
  onRestoreVersion,
  onClose,
}) => {
  const [fileHistory, setFileHistory] = useState<FileHistory | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  useEffect(() => {
    const history = fileHistoryService.getFileHistory(projectId, filePath);
    setFileHistory(history);
    
    if (history && history.versions.length > 0) {
      setSelectedVersion(history.versions[0]);
    }
  }, [projectId, filePath]);

  const handleRestoreVersion = (version: FileVersion) => {
    if (window.confirm(`Are you sure you want to restore to version from ${version.timestamp.toLocaleString()}?`)) {
      const restoredVersion = fileHistoryService.restoreVersion(projectId, filePath, version.id);
      if (restoredVersion) {
        onRestoreVersion(restoredVersion.content);
        // Refresh history
        const updatedHistory = fileHistoryService.getFileHistory(projectId, filePath);
        setFileHistory(updatedHistory);
      }
    }
  };

  const handleDeleteVersion = (version: FileVersion) => {
    if (window.confirm(`Are you sure you want to delete this version from ${version.timestamp.toLocaleString()}?`)) {
      // Note: This would require implementing deleteVersion in the service
      // For now, we'll just show a message
      alert('Version deletion is not yet implemented');
    }
  };

  const handleDownloadVersion = (version: FileVersion) => {
    const blob = new Blob([version.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePath.split('/').pop()}-${version.timestamp.toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getChangeTypeColor = (changeType: FileVersion['changeType']): string => {
    switch (changeType) {
      case 'create':
        return 'text-green-600 dark:text-green-400';
      case 'update':
        return 'text-blue-600 dark:text-blue-400';
      case 'delete':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getChangeTypeIcon = (changeType: FileVersion['changeType']) => {
    switch (changeType) {
      case 'create':
        return '+';
      case 'update':
        return '~';
      case 'delete':
        return '-';
      default:
        return '?';
    }
  };

  if (!fileHistory || fileHistory.versions.length === 0) {
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">File History</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No history available</p>
            <p className="text-sm">File versions will appear here as you make changes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">File History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {fileHistory.versions.length} version{fileHistory.versions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {fileHistory.versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                selectedVersion?.id === version.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setSelectedVersion(version)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono ${getChangeTypeColor(version.changeType)}`}>
                      {getChangeTypeIcon(version.changeType)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {index === 0 ? 'Current' : `${index + 1} versions ago`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                    {version.timestamp.toLocaleString()}
                  </div>
                  {version.description && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {version.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(version.size)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Version Actions */}
      {selectedVersion && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            
            {selectedVersion.id !== fileHistory.currentVersion && (
              <button
                onClick={() => handleRestoreVersion(selectedVersion)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <RotateCcw className="w-4 h-4" />
                Restore Version
              </button>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadVersion(selectedVersion)}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              
              {selectedVersion.id !== fileHistory.currentVersion && (
                <button
                  onClick={() => handleDeleteVersion(selectedVersion)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && selectedVersion && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Preview
            </h4>
            <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 max-h-40 overflow-y-auto">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedVersion.content.slice(0, 1000)}
                {selectedVersion.content.length > 1000 && '...'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};