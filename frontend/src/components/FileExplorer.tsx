import React, { useState, useRef, useCallback } from 'react';
import { FileNode, ContextMenuAction } from '../types/file';
import { FileTreeItem } from './FileTreeItem';
import { ContextMenu } from './ContextMenu';
import { FileUploadDropzone } from './FileUploadDropzone';
import { CreateFileDialog } from './CreateFileDialog';
import { RenameDialog } from './RenameDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { 
  FolderPlus, 
  FilePlus, 
  Upload,
  RefreshCw,
  Search
} from 'lucide-react';

interface FileExplorerProps {
  projectFiles: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (path: string, type: 'file' | 'folder', name: string) => Promise<void>;
  onFileDelete: (path: string) => Promise<void>;
  onFileRename: (oldPath: string, newPath: string) => Promise<void>;
  onFileUpload: (files: FileList, targetPath?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  selectedFile?: FileNode;
  isLoading?: boolean;
  onHistoryClick?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  projectFiles,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFileUpload,
  onRefresh,
  selectedFile,
  isLoading = false,
  onHistoryClick,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode;
  } | null>(null);
  
  const [createDialog, setCreateDialog] = useState<{
    type: 'file' | 'folder';
    parentPath: string;
  } | null>(null);
  
  const [renameDialog, setRenameDialog] = useState<FileNode | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<FileNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = useCallback((event: React.MouseEvent, node: FileNode) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const contextMenuActions: ContextMenuAction[] = [
    {
      id: 'new-file',
      label: 'New File',
      icon: 'FilePlus',
    },
    {
      id: 'new-folder',
      label: 'New Folder',
      icon: 'FolderPlus',
    },
    {
      id: 'separator-1',
      label: '',
      separator: true,
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: 'Edit',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'Trash2',
    },
    {
      id: 'separator-2',
      label: '',
      separator: true,
    },
    {
      id: 'upload',
      label: 'Upload Files',
      icon: 'Upload',
      disabled: contextMenu?.node.type === 'file',
    },
  ];

  const handleContextMenuAction = useCallback(async (actionId: string) => {
    if (!contextMenu) return;
    
    const { node } = contextMenu;
    
    switch (actionId) {
      case 'new-file':
        setCreateDialog({
          type: 'file',
          parentPath: node.type === 'folder' ? node.path : node.path.split('/').slice(0, -1).join('/'),
        });
        break;
        
      case 'new-folder':
        setCreateDialog({
          type: 'folder',
          parentPath: node.type === 'folder' ? node.path : node.path.split('/').slice(0, -1).join('/'),
        });
        break;
        
      case 'rename':
        setRenameDialog(node);
        break;
        
      case 'delete':
        setDeleteDialog(node);
        break;
        
      case 'upload':
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
        break;
    }
    
    handleCloseContextMenu();
  }, [contextMenu, handleCloseContextMenu]);

  const handleFileUploadInput = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    // If upload was triggered from context menu, use that path
    // Otherwise upload to root directory
    let targetPath = '';
    if (contextMenu) {
      targetPath = contextMenu.node.type === 'folder' 
        ? contextMenu.node.path 
        : contextMenu.node.path.split('/').slice(0, -1).join('/');
    }
      
    await onFileUpload(files, targetPath);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [contextMenu, onFileUpload]);

  const handleCreateFile = useCallback(async (name: string) => {
    if (!createDialog) return;
    
    await onFileCreate(createDialog.parentPath, createDialog.type, name);
    setCreateDialog(null);
  }, [createDialog, onFileCreate]);

  const handleRenameFile = useCallback(async (newName: string) => {
    if (!renameDialog) return;
    
    const pathParts = renameDialog.path.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');
    
    await onFileRename(renameDialog.path, newPath);
    setRenameDialog(null);
  }, [renameDialog, onFileRename]);

  const handleDeleteFile = useCallback(async () => {
    if (!deleteDialog) return;
    
    await onFileDelete(deleteDialog.path);
    setDeleteDialog(null);
  }, [deleteDialog, onFileDelete]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const filterFiles = useCallback((files: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return files;
    
    return files.filter(file => {
      const matchesQuery = file.name.toLowerCase().includes(query.toLowerCase());
      if (file.type === 'folder' && file.children) {
        const filteredChildren = filterFiles(file.children, query);
        return matchesQuery || filteredChildren.length > 0;
      }
      return matchesQuery;
    }).map(file => {
      if (file.type === 'folder' && file.children) {
        return {
          ...file,
          children: filterFiles(file.children, query),
        };
      }
      return file;
    });
  }, []);

  const filteredFiles = filterFiles(projectFiles, searchQuery);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Explorer
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCreateDialog({ type: 'file', parentPath: '' })}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="New File"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCreateDialog({ type: 'folder', parentPath: '' })}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Upload Files"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {onHistoryClick && (
              <button
                onClick={onHistoryClick}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                title="File History"
              >
                {/* Reuse History icon via unicode clock fallback if not imported here */}
                <span className="w-4 h-4 inline-block">🕘</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* File Tree */}
      <FileUploadDropzone onFileUpload={onFileUpload}>
        <div className="flex-1 overflow-auto p-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No files match your search' : 'No files in this project'}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredFiles.map((file) => (
                <FileTreeItem
                  key={file.id}
                  node={file}
                  level={0}
                  isSelected={selectedFile?.id === file.id}
                  isExpanded={expandedFolders.has(file.path)}
                  onSelect={onFileSelect}
                  onToggle={toggleFolder}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </div>
          )}
        </div>
      </FileUploadDropzone>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUploadInput}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextMenuActions}
          onAction={handleContextMenuAction}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Dialogs */}
      {createDialog && (
        <CreateFileDialog
          type={createDialog.type}
          onConfirm={handleCreateFile}
          onCancel={() => setCreateDialog(null)}
        />
      )}

      {renameDialog && (
        <RenameDialog
          currentName={renameDialog.name}
          onConfirm={handleRenameFile}
          onCancel={() => setRenameDialog(null)}
        />
      )}

      {deleteDialog && (
        <DeleteConfirmDialog
          fileName={deleteDialog.name}
          fileType={deleteDialog.type}
          onConfirm={handleDeleteFile}
          onCancel={() => setDeleteDialog(null)}
        />
      )}
    </div>
  );
};