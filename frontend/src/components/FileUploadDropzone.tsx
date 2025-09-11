import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadDropzoneProps {
  children: React.ReactNode;
  onFileUpload: (files: FileList, targetPath?: string) => Promise<void>;
  targetPath?: string;
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  children,
  onFileUpload,
  targetPath,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setDragCounter(prev => prev + 1);
    
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setIsDragOver(false);
    setDragCounter(0);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      await onFileUpload(files, targetPath);
    }
  }, [onFileUpload, targetPath]);

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Drop files here to upload
            </p>
            <p className="text-sm text-blue-500 dark:text-blue-300 mt-1">
              Files will be uploaded to the current directory
            </p>
          </div>
        </div>
      )}
    </div>
  );
};