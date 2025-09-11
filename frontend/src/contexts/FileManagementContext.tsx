import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FileNode, FileOperationResult } from '../types/file';
import { fileService, FileContent } from '../services/fileService';
import { fileHistoryService } from '../services/fileHistoryService';
import { useAutoSave } from '../hooks/useAutoSave';

interface FileManagementState {
  projectId: string;
  files: FileNode[];
  currentFile: FileContent | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  conflictData: {
    serverContent: string;
    localContent: string;
    filePath: string;
  } | null;
  showFileHistory: boolean;
}

interface FileManagementActions {
  // File operations
  loadFileTree: () => Promise<void>;
  loadFile: (filePath: string) => Promise<void>;
  saveFile: (filePath: string, content: string) => Promise<void>;
  createFile: (parentPath: string, type: 'file' | 'folder', name: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  uploadFiles: (files: FileList, targetPath?: string) => Promise<void>;
  
  // Content management
  updateFileContent: (content: string) => void;
  
  // Conflict resolution
  resolveConflict: (resolution: 'local' | 'server' | 'merge', content?: string) => Promise<void>;
  
  // History management
  toggleFileHistory: () => void;
  restoreFileVersion: (content: string) => void;
  
  // State management
  clearError: () => void;
  setProjectId: (projectId: string) => void;
}

interface FileManagementContextType extends FileManagementState, FileManagementActions {}

const FileManagementContext = createContext<FileManagementContextType | null>(null);

export const useFileManagement = () => {
  const context = useContext(FileManagementContext);
  if (!context) {
    throw new Error('useFileManagement must be used within a FileManagementProvider');
  }
  return context;
};

interface FileManagementProviderProps {
  children: React.ReactNode;
  initialProjectId?: string;
}

export const FileManagementProvider: React.FC<FileManagementProviderProps> = ({
  children,
  initialProjectId = 'default-project',
}) => {
  const [state, setState] = useState<FileManagementState>({
    projectId: initialProjectId,
    files: [],
    currentFile: null,
    isLoading: false,
    error: null,
    hasUnsavedChanges: false,
    conflictData: null,
    showFileHistory: false,
  });

  // Auto-save functionality
  const { saveNow, isSaving } = useAutoSave({
    projectId: state.projectId,
    filePath: state.currentFile?.path || '',
    content: state.currentFile?.content || '',
    enabled: !!state.currentFile && state.hasUnsavedChanges,
    onSave: (success, error) => {
      if (success) {
        setState(prev => ({ ...prev, hasUnsavedChanges: false, error: null }));
        // Save to history
        if (state.currentFile) {
          fileHistoryService.saveVersion(
            state.projectId,
            state.currentFile.path,
            state.currentFile.content,
            state.currentFile.checksum,
            'update',
            'Auto-saved'
          );
        }
      } else {
        setState(prev => ({ ...prev, error: error || 'Failed to save file' }));
      }
    },
    onConflict: (serverContent, localContent) => {
      setState(prev => ({
        ...prev,
        conflictData: {
          serverContent,
          localContent,
          filePath: state.currentFile?.path || '',
        },
      }));
    },
  });

  const loadFileTree = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const files = await fileService.getFileTree(state.projectId);
      setState(prev => ({ ...prev, files, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load files',
        isLoading: false,
      }));
    }
  }, [state.projectId]);

  const loadFile = useCallback(async (filePath: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const fileContent = await fileService.getFileContent(state.projectId, filePath);
      setState(prev => ({
        ...prev,
        currentFile: fileContent,
        hasUnsavedChanges: false,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load file',
        isLoading: false,
      }));
    }
  }, [state.projectId]);

  const saveFile = useCallback(async (filePath: string, content: string) => {
    try {
      const result = await fileService.updateFile(state.projectId, { path: filePath, content });
      
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          currentFile: result.data as FileContent,
          hasUnsavedChanges: false,
          error: null,
        }));
        
        // Save to history
        fileHistoryService.saveVersion(
          state.projectId,
          filePath,
          content,
          (result.data as any).checksum || '',
          'update',
          'Manual save'
        );
      } else {
        setState(prev => ({ ...prev, error: result.message || 'Failed to save file' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save file',
      }));
    }
  }, [state.projectId]);  const 
createFile = useCallback(async (parentPath: string, type: 'file' | 'folder', name: string) => {
    try {
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      const result = await fileService.createFile(state.projectId, {
        path: fullPath,
        type,
        content: type === 'file' ? '' : undefined,
      });
      
      if (result.success) {
        await loadFileTree(); // Refresh file tree
        
        if (type === 'file' && result.data) {
          // Save initial version to history
          fileHistoryService.saveVersion(
            state.projectId,
            fullPath,
            '',
            (result.data as any).checksum || '',
            'create',
            'File created'
          );
        }
      } else {
        setState(prev => ({ ...prev, error: result.message || 'Failed to create file' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create file',
      }));
    }
  }, [state.projectId, loadFileTree]);

  const deleteFile = useCallback(async (filePath: string) => {
    try {
      const result = await fileService.deleteFile(state.projectId, filePath);
      
      if (result.success) {
        await loadFileTree(); // Refresh file tree
        
        // Clear current file if it was deleted
        if (state.currentFile?.path === filePath) {
          setState(prev => ({ ...prev, currentFile: null, hasUnsavedChanges: false }));
        }
        
        // Save deletion to history
        fileHistoryService.saveVersion(
          state.projectId,
          filePath,
          '',
          '',
          'delete',
          'File deleted'
        );
      } else {
        setState(prev => ({ ...prev, error: result.message || 'Failed to delete file' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      }));
    }
  }, [state.projectId, loadFileTree, state.currentFile]);

  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    try {
      // For now, we'll implement rename as copy + delete
      // In a real implementation, the backend should handle this atomically
      if (state.currentFile?.path === oldPath) {
        const content = state.currentFile.content;
        
        // Create new file
        await fileService.createFile(state.projectId, {
          path: newPath,
          type: 'file',
          content,
        });
        
        // Delete old file
        await fileService.deleteFile(state.projectId, oldPath);
        
        // Update current file path
        setState(prev => ({
          ...prev,
          currentFile: prev.currentFile ? { ...prev.currentFile, path: newPath } : null,
        }));
        
        // Save to history
        fileHistoryService.saveVersion(
          state.projectId,
          newPath,
          content,
          state.currentFile.checksum,
          'update',
          `Renamed from ${oldPath}`
        );
      } else {
        // File not currently loaded, just rename
        const fileContent = await fileService.getFileContent(state.projectId, oldPath);
        await fileService.createFile(state.projectId, {
          path: newPath,
          type: 'file',
          content: fileContent.content,
        });
        await fileService.deleteFile(state.projectId, oldPath);
      }
      
      await loadFileTree(); // Refresh file tree
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to rename file',
      }));
    }
  }, [state.projectId, state.currentFile, loadFileTree]);

  const uploadFiles = useCallback(async (files: FileList, targetPath?: string) => {
    console.log('🔄 Starting file upload...', { fileCount: files.length, targetPath, projectId: state.projectId });
    
    try {
      const result = await fileService.uploadFiles(state.projectId, files, targetPath);
      console.log('📤 Upload result:', result);
      
      if (result.success) {
        console.log('✅ Upload successful, refreshing file tree...');
        await loadFileTree(); // Refresh file tree
        console.log('🔄 File tree refreshed');
      } else {
        console.error('❌ Upload failed:', result.message);
        setState(prev => ({ ...prev, error: result.message || 'Failed to upload files' }));
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to upload files',
      }));
    }
  }, [state.projectId, loadFileTree]);

  const updateFileContent = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      currentFile: prev.currentFile ? { ...prev.currentFile, content } : null,
      hasUnsavedChanges: true,
    }));
  }, []);

  const resolveConflict = useCallback(async (
    resolution: 'local' | 'server' | 'merge',
    content?: string
  ) => {
    if (!state.conflictData) return;
    
    let resolvedContent: string;
    
    switch (resolution) {
      case 'local':
        resolvedContent = state.conflictData.localContent;
        break;
      case 'server':
        resolvedContent = state.conflictData.serverContent;
        break;
      case 'merge':
        resolvedContent = content || state.conflictData.localContent;
        break;
    }
    
    try {
      await saveFile(state.conflictData.filePath, resolvedContent);
      setState(prev => ({ ...prev, conflictData: null }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict',
      }));
    }
  }, [state.conflictData, saveFile]);

  const toggleFileHistory = useCallback(() => {
    setState(prev => ({ ...prev, showFileHistory: !prev.showFileHistory }));
  }, []);

  const restoreFileVersion = useCallback((content: string) => {
    if (state.currentFile) {
      setState(prev => ({
        ...prev,
        currentFile: prev.currentFile ? { ...prev.currentFile, content } : null,
        hasUnsavedChanges: true,
      }));
    }
  }, [state.currentFile]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setProjectId = useCallback((projectId: string) => {
    setState(prev => ({
      ...prev,
      projectId,
      files: [],
      currentFile: null,
      hasUnsavedChanges: false,
      error: null,
      conflictData: null,
    }));
  }, []);

  // Load file tree on project change
  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  const contextValue: FileManagementContextType = {
    // State
    ...state,
    
    // Actions
    loadFileTree,
    loadFile,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
    uploadFiles,
    updateFileContent,
    resolveConflict,
    toggleFileHistory,
    restoreFileVersion,
    clearError,
    setProjectId,
  };

  return (
    <FileManagementContext.Provider value={contextValue}>
      {children}
    </FileManagementContext.Provider>
  );
};