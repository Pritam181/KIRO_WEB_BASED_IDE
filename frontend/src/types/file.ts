export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: Date;
  children?: FileNode[];
  isExpanded?: boolean;
}

export interface FileTree {
  [path: string]: FileNode;
}

export interface FileOperationResult {
  success: boolean;
  message?: string;
  data?: FileNode;
}

export interface DragDropData {
  type: 'file' | 'folder';
  node: FileNode;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
}