import React from 'react';
import { FileText } from 'lucide-react';

export const EditorPage: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          No file selected
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Select a file from the workspace to start editing.
        </p>
      </div>
    </div>
  );
};