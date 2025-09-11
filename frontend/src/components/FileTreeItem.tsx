import React from 'react';
import { FileNode } from '../types/file';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  Image,
  FileText,
  Code,
  Settings
} from 'lucide-react';

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (node: FileNode) => void;
  onToggle: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
}

const getFileIcon = (fileName: string, isFolder: boolean, isOpen: boolean) => {
  if (isFolder) {
    return isOpen ? FolderOpen : Folder;
  }
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'cs':
    case 'php':
    case 'rb':
    case 'go':
    case 'rs':
      return Code;
    case 'md':
    case 'txt':
    case 'doc':
    case 'docx':
      return FileText;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return Image;
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
      return Settings;
    default:
      return File;
  }
};

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  level,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  onContextMenu,
}) => {
  const Icon = getFileIcon(node.name, node.type === 'folder', isExpanded);
  const hasChildren = node.type === 'folder' && node.children && node.children.length > 0;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (node.type === 'folder') {
      onToggle(node.path);
    } else {
      onSelect(node);
    }
  };

  const handleToggleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggle(node.path);
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer
          hover:bg-gray-100 dark:hover:bg-gray-800
          ${isSelected ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {/* Toggle button for folders */}
        {node.type === 'folder' && (
          <button
            onClick={handleToggleClick}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )
            ) : (
              <div className="w-3 h-3" />
            )}
          </button>
        )}
        
        {/* File/folder icon */}
        <Icon className="w-4 h-4 flex-shrink-0" />
        
        {/* File/folder name */}
        <span className="truncate flex-1">{node.name}</span>
        
        {/* File size for files */}
        {node.type === 'file' && node.size && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>

      {/* Render children if folder is expanded */}
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={isSelected}
              isExpanded={isExpanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}