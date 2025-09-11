import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  fileName: string;
  fileType: 'file' | 'folder';
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  fileName,
  fileType,
  onConfirm,
  onCancel,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel();
    } else if (event.key === 'Enter') {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete {fileType === 'file' ? 'File' : 'Folder'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-900 dark:text-gray-100 mb-2">
                Are you sure you want to delete <strong>"{fileName}"</strong>?
              </p>
              {fileType === 'folder' && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  This will permanently delete the folder and all its contents.
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              onKeyDown={handleKeyDown}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              onKeyDown={handleKeyDown}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};