import React, { createContext, useContext, useState, useCallback } from 'react';
import { FileNode } from '../types/file';
import { FileContent } from '../services/fileService';

interface FileManagementState {
  projectId: string;
  files: FileNode[];
  currentFile: FileContent | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  conflictData: null;
  showFileHistory: boolean;
}

interface FileManagementActions {
  loadFileTree: () => Promise<void>;
  loadFile: (filePath: string) => Promise<void>;
  saveFile: (filePath: string, content: string) => Promise<void>;
  createFile: (parentPath: string, type: 'file' | 'folder', name: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  uploadFiles: (files: FileList, targetPath?: string) => Promise<void>;
  updateFileContent: (content: string) => void;
  resolveConflict: (resolution: 'local' | 'server' | 'merge', content?: string) => Promise<void>;
  toggleFileHistory: () => void;
  restoreFileVersion: (content: string) => void;
  clearError: () => void;
  setProjectId: (projectId: string) => void;
}

interface FileManagementContextType extends FileManagementState, FileManagementActions {}

const DemoFileManagementContext = createContext<FileManagementContextType | null>(null);

export const useDemoFileManagement = () => {
  const context = useContext(DemoFileManagementContext);
  if (!context) {
    throw new Error('useDemoFileManagement must be used within a DemoFileManagementProvider');
  }
  return context;
};

interface DemoFileManagementProviderProps {
  children: React.ReactNode;
}

export const DemoFileManagementProvider: React.FC<DemoFileManagementProviderProps> = ({ children }) => {
  const [state, setState] = useState<FileManagementState>({
    projectId: 'demo-project',
    files: [
      {
        id: 'src',
        name: 'src',
        path: 'src',
        type: 'folder',
        children: [
          {
            id: 'src/index.js',
            name: 'index.js',
            path: 'src/index.js',
            type: 'file',
            size: 156,
            lastModified: new Date(),
          },
          {
            id: 'src/App.js',
            name: 'App.js',
            path: 'src/App.js',
            type: 'file',
            size: 324,
            lastModified: new Date(),
          },
        ],
        isExpanded: true,
      },
      {
        id: 'README.md',
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        size: 89,
        lastModified: new Date(),
      },
      {
        id: 'package.json',
        name: 'package.json',
        path: 'package.json',
        type: 'file',
        size: 445,
        lastModified: new Date(),
      },
    ],
    currentFile: null,
    isLoading: false,
    error: null,
    hasUnsavedChanges: false,
    conflictData: null,
    showFileHistory: false,
  });

  // Mock file contents
  const mockFileContents: Record<string, string> = {
    'src/index.js': `console.log('Hello, Kiro Web IDE!');

// This is a demo file in the Kiro Web IDE
// You can edit this content and see changes in real-time

function greet(name) {
  return \`Hello, \${name}! Welcome to Kiro.\`;
}

console.log(greet('Developer'));`,

    'src/App.js': `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Kiro Web IDE</h1>
        <p>This is a demo React application.</p>
        <p>Edit this file to see changes!</p>
      </header>
    </div>
  );
}

export default App;`,

    'README.md': `# Demo Project

Welcome to the Kiro Web IDE demo!

## Features

- File explorer
- Code editor with syntax highlighting
- Real-time editing
- Project management

This is a demonstration of the Kiro Web IDE capabilities.`,

    'package.json': `{
  "name": "demo-project",
  "version": "1.0.0",
  "description": "A demo project for Kiro Web IDE",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}`
  };

  const loadFileTree = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const loadFile = useCallback(async (filePath: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const content = mockFileContents[filePath] || `// New file: ${filePath}\n\n// Start coding here...`;
    
    const fileContent: FileContent = {
      path: filePath,
      content,
      language: getLanguageFromPath(filePath),
      size: content.length,
      lastModified: new Date(),
      checksum: Math.random().toString(36).substring(7),
    };
    
    setState(prev => ({ 
      ...prev, 
      currentFile: fileContent, 
      isLoading: false,
      hasUnsavedChanges: false 
    }));
  }, []);

  const saveFile = useCallback(async (filePath: string, content: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Update mock content
    mockFileContents[filePath] = content;
    
    setState(prev => ({ 
      ...prev, 
      isLoading: false,
      hasUnsavedChanges: false,
      error: null 
    }));
  }, []);

  const createFile = useCallback(async (parentPath: string, type: 'file' | 'folder', name: string) => {
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    
    if (type === 'file') {
      mockFileContents[newPath] = `// New file: ${name}\n\n`;
    }
    
    // Add to file tree (simplified)
    const newFile: FileNode = {
      id: newPath,
      name,
      path: newPath,
      type,
      size: type === 'file' ? 20 : undefined,
      lastModified: new Date(),
      children: type === 'folder' ? [] : undefined,
    };
    
    setState(prev => ({ 
      ...prev, 
      files: [...prev.files, newFile],
      error: null 
    }));
  }, []);

  const deleteFile = useCallback(async (filePath: string) => {
    delete mockFileContents[filePath];
    
    setState(prev => ({ 
      ...prev, 
      files: prev.files.filter(f => f.path !== filePath),
      currentFile: prev.currentFile?.path === filePath ? null : prev.currentFile,
      error: null 
    }));
  }, []);

  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    if (mockFileContents[oldPath]) {
      mockFileContents[newPath] = mockFileContents[oldPath];
      delete mockFileContents[oldPath];
    }
    
    setState(prev => ({ 
      ...prev, 
      files: prev.files.map(f => 
        f.path === oldPath 
          ? { ...f, path: newPath, name: newPath.split('/').pop() || newPath }
          : f
      ),
      currentFile: prev.currentFile?.path === oldPath 
        ? { ...prev.currentFile, path: newPath }
        : prev.currentFile,
      error: null 
    }));
  }, []);

  const uploadFiles = useCallback(async (files: FileList, targetPath?: string) => {
    // Mock file upload
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await file.text();
      const path = targetPath ? `${targetPath}/${file.name}` : file.name;
      mockFileContents[path] = content;
      
      const newFile: FileNode = {
        id: path,
        name: file.name,
        path,
        type: 'file',
        size: file.size,
        lastModified: new Date(file.lastModified),
      };
      
      setState(prev => ({ 
        ...prev, 
        files: [...prev.files, newFile] 
      }));
    }
  }, []);

  const updateFileContent = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      currentFile: prev.currentFile ? { ...prev.currentFile, content } : null,
      hasUnsavedChanges: true,
    }));
  }, []);

  const resolveConflict = useCallback(async (resolution: 'local' | 'server' | 'merge', content?: string) => {
    setState(prev => ({ ...prev, conflictData: null }));
  }, []);

  const toggleFileHistory = useCallback(() => {
    setState(prev => ({ ...prev, showFileHistory: !prev.showFileHistory }));
  }, []);

  const restoreFileVersion = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      currentFile: prev.currentFile ? { ...prev.currentFile, content } : null,
      hasUnsavedChanges: true,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setProjectId = useCallback((projectId: string) => {
    setState(prev => ({ ...prev, projectId }));
  }, []);

  const value: FileManagementContextType = {
    ...state,
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
    <DemoFileManagementContext.Provider value={value}>
      {children}
    </DemoFileManagementContext.Provider>
  );
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}