import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  ProjectListItem, 
  ProjectPermissions,
  ShareProjectRequest,
  ProjectCollaborator
} from '../types/project';

import { config } from '../config/environment';

class ProjectService {
  private projectsDir: string;

  constructor() {
    this.projectsDir = path.join(config.dataDir || './data', 'projects');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
      console.log('📁 Project service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize project service:', error);
      throw error;
    }
  }

  async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    const projectId = uuidv4();
    const now = new Date();

    const project: Project = {
      id: projectId,
      name: projectData.name,
      description: projectData.description,
      ownerId: userId,
      collaborators: [],
      fileTree: {},
      createdAt: now,
      updatedAt: now
    };

    // Create project directory
    const projectDir = path.join(this.projectsDir, projectId);
    await fs.mkdir(projectDir, { recursive: true });

    // Save project metadata
    await this.saveProject(project);

    // Create default project structure
    await this.createDefaultProjectStructure(projectId);

    return project;
  }

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    try {
      const project = await this.loadProject(projectId);
      if (!project) return null;

      // Check if user has access to this project
      if (!this.hasProjectAccess(project, userId)) {
        return null;
      }

      return project;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  async updateProject(projectId: string, userId: string, updates: UpdateProjectRequest): Promise<Project | null> {
    const project = await this.getProject(projectId, userId);
    if (!project) return null;

    // Check if user can modify this project
    if (!this.canModifyProject(project, userId)) {
      return null;
    }

    // Update project data
    if (updates.name !== undefined) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;
    project.updatedAt = new Date();

    await this.saveProject(project);
    return project;
  }

  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId, userId);
    if (!project) return false;

    // Only owner can delete project
    if (project.ownerId !== userId) {
      return false;
    }

    try {
      // Delete project directory and all files
      const projectDir = path.join(this.projectsDir, projectId);
      await fs.rm(projectDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  async listUserProjects(userId: string): Promise<ProjectListItem[]> {
    try {
      const projectDirs = await fs.readdir(this.projectsDir);
      const projects: ProjectListItem[] = [];

      for (const projectId of projectDirs) {
        try {
          const project = await this.loadProject(projectId);
          if (!project || !this.hasProjectAccess(project, userId)) {
            continue;
          }

          const permissions = this.getUserPermissions(project, userId);
          const projectItem: ProjectListItem = {
            id: project.id,
            name: project.name,
            description: project.description,
            ownerId: project.ownerId,
            isOwner: project.ownerId === userId,
            permissions,
            collaboratorCount: project.collaborators.length,
            lastModified: project.updatedAt,
            createdAt: project.createdAt
          };

          projects.push(projectItem);
        } catch (error) {
          console.error(`Error loading project ${projectId}:`, error);
          continue;
        }
      }

      // Sort by last modified date (newest first)
      return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      console.error('Error listing user projects:', error);
      return [];
    }
  }

  async shareProject(projectId: string, ownerId: string, shareRequest: ShareProjectRequest): Promise<boolean> {
    const project = await this.getProject(projectId, ownerId);
    if (!project || project.ownerId !== ownerId) {
      return false;
    }

    // Add collaborator if not already present
    if (!project.collaborators.includes(shareRequest.collaboratorId)) {
      project.collaborators.push(shareRequest.collaboratorId);
      project.updatedAt = new Date();
      await this.saveProject(project);
    }

    return true;
  }

  async removeCollaborator(projectId: string, ownerId: string, collaboratorId: string): Promise<boolean> {
    const project = await this.getProject(projectId, ownerId);
    if (!project || project.ownerId !== ownerId) {
      return false;
    }

    const index = project.collaborators.indexOf(collaboratorId);
    if (index > -1) {
      project.collaborators.splice(index, 1);
      project.updatedAt = new Date();
      await this.saveProject(project);
    }

    return true;
  }

  async getProjectCollaborators(projectId: string, userId: string): Promise<ProjectCollaborator[]> {
    const project = await this.getProject(projectId, userId);
    if (!project) return [];

    // For now, return basic collaborator info
    // In a real implementation, you'd fetch user details from a user service
    return project.collaborators.map(collaboratorId => ({
      userId: collaboratorId,
      username: `user-${collaboratorId}`, // Placeholder
      avatarUrl: '', // Placeholder
      permissions: this.getDefaultCollaboratorPermissions(),
      addedAt: project.createdAt // Placeholder
    }));
  }

  private async loadProject(projectId: string): Promise<Project | null> {
    try {
      const projectFile = path.join(this.projectsDir, projectId, 'project.json');
      const data = await fs.readFile(projectFile, 'utf-8');
      const project = JSON.parse(data);
      
      // Convert date strings back to Date objects
      project.createdAt = new Date(project.createdAt);
      project.updatedAt = new Date(project.updatedAt);
      
      return project;
    } catch (error) {
      return null;
    }
  }

  private async saveProject(project: Project): Promise<void> {
    const projectDir = path.join(this.projectsDir, project.id);
    const projectFile = path.join(projectDir, 'project.json');
    
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(projectFile, JSON.stringify(project, null, 2));
  }

  private async createDefaultProjectStructure(projectId: string): Promise<void> {
    const projectDir = path.join(this.projectsDir, projectId);
    
    // Create default files and folders
    const defaultFiles = [
      { path: 'README.md', content: '# New Project\n\nWelcome to your new project!\n' },
      { path: 'src/index.js', content: 'console.log("Hello, World!");\n' },
      { path: 'package.json', content: JSON.stringify({
        name: 'new-project',
        version: '1.0.0',
        description: '',
        main: 'src/index.js',
        scripts: {
          start: 'node src/index.js'
        }
      }, null, 2) }
    ];

    for (const file of defaultFiles) {
      const filePath = path.join(projectDir, file.path);
      const fileDir = path.dirname(filePath);
      
      await fs.mkdir(fileDir, { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
  }

  private hasProjectAccess(project: Project, userId: string): boolean {
    return project.ownerId === userId || project.collaborators.includes(userId);
  }

  private canModifyProject(project: Project, userId: string): boolean {
    // For now, only owner can modify. In future, check collaborator permissions
    return project.ownerId === userId;
  }

  private getUserPermissions(project: Project, userId: string): ProjectPermissions {
    if (project.ownerId === userId) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canShare: true
      };
    }

    if (project.collaborators.includes(userId)) {
      return this.getDefaultCollaboratorPermissions();
    }

    return {
      canRead: false,
      canWrite: false,
      canDelete: false,
      canShare: false
    };
  }

  private getDefaultCollaboratorPermissions(): ProjectPermissions {
    return {
      canRead: true,
      canWrite: true,
      canDelete: false,
      canShare: false
    };
  }
}

export const projectService = new ProjectService();