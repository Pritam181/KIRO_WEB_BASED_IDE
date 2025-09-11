export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  collaborators: string[];
  fileTree: FileTree;
  githubRepo?: {
    owner: string;
    name: string;
    url: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export interface ProjectCollaborator {
  userId: string;
  username: string;
  avatarUrl: string;
  permissions: ProjectPermissions;
  addedAt: Date;
}

export interface ShareProjectRequest {
  collaboratorId: string;
  permissions: ProjectPermissions;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isOwner: boolean;
  permissions: ProjectPermissions;
  collaboratorCount: number;
  lastModified: Date;
  createdAt: Date;
}

import { FileTree } from './file';