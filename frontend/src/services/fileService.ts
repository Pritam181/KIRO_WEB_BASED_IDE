import axios from 'axios';
import { FileNode, FileOperationResult } from '../types/file';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Make sure the backend is running on port 5001.`);
    }
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Check if the backend server is running the correct version.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Backend server error. Check the server logs for details.');
    }
    throw error;
  }
);

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
  checksum: string;
}

export interface CreateFileRequest {
  path: string;
  type: 'file' | 'folder';
  content?: string;
}

export interface UpdateFileRequest {
  path: string;
  content: string;
}

export interface FileTreeResponse {
  success: boolean;
  message: string;
  data: Record<string, any>;
}

export const fileService = {
  /**
   * Get file tree for a project
   */
  async getFileTree(projectId: string, rootPath?: string): Promise<FileNode[]> {
    const params = rootPath ? { path: rootPath } : {};
    const response = await api.get<FileTreeResponse>(`/api/files/${projectId}/tree`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    
    return this.convertFileTreeToNodes(response.data.data);
  },

  /**
   * Get file content
   */
  async getFileContent(projectId: string, filePath: string): Promise<FileContent> {
    const response = await api.get<{ success: boolean; data: FileContent }>(`/api/files/${projectId}/${filePath}`);
    
    if (!response.data.success) {
      throw new Error('Failed to load file content');
    }
    
    return response.data.data;
  },

  /**
   * Create a new file or folder
   */
  async createFile(projectId: string, request: CreateFileRequest): Promise<FileOperationResult> {
    const response = await api.post<FileOperationResult>(`/api/files/${projectId}`, request);
    return response.data;
  },

  /**
   * Update file content
   */
  async updateFile(projectId: string, request: UpdateFileRequest): Promise<FileOperationResult> {
    const response = await api.put<FileOperationResult>(`/api/files/${projectId}/${request.path}`, {
      content: request.content
    });
    return response.data;
  },

  /**
   * Delete file or folder
   */
  async deleteFile(projectId: string, filePath: string): Promise<FileOperationResult> {
    const response = await api.delete<FileOperationResult>(`/api/files/${projectId}/${filePath}`);
    return response.data;
  },

  /**
   * Upload files
   */
  async uploadFiles(projectId: string, files: FileList, targetPath?: string): Promise<FileOperationResult> {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    if (targetPath) {
      formData.append('targetPath', targetPath);
    }
    
    const response = await api.post<FileOperationResult>(`/api/files/${projectId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  /**
   * Convert backend file tree format to frontend FileNode format
   */
  convertFileTreeToNodes(fileTree: Record<string, any>, parentPath = ''): FileNode[] {
    const nodes: FileNode[] = [];
    
    Object.entries(fileTree).forEach(([path, item]) => {
      const fullPath = parentPath ? `${parentPath}/${path}` : path;
      const name = path.split('/').pop() || path;
      
      const node: FileNode = {
        id: fullPath,
        name,
        path: fullPath,
        type: item.type,
        size: item.metadata?.size,
        lastModified: item.metadata?.lastModified ? new Date(item.metadata.lastModified) : undefined,
      };
      
      if (item.type === 'folder' && item.children) {
        node.children = this.convertFileTreeToNodes(item.children, fullPath);
      }
      
      nodes.push(node);
    });
    
    return nodes.sort((a, b) => {
      // Folders first, then files, both alphabetically
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  },
};