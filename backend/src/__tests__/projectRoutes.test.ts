import request from 'supertest';
import express from 'express';
import projectRoutes from '../routes/projects';
import { projectService } from '../services/projectService';
import { requireAuth } from '../middleware/auth';

// Mock the project service
jest.mock('../services/projectService');
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

// Mock the auth middleware
jest.mock('../middleware/auth');
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

// Mock validation middleware
jest.mock('../middleware/validation', () => ({
  validateRequest: () => (_req: any, _res: any, next: any) => next()
}));

const app = express();
app.use(express.json());

// Mock auth middleware to add user to request
mockRequireAuth.mockImplementation((req: any, _res: any, next: any) => {
  req.user = { id: 'user-123', username: 'testuser' };
  next();
});

app.use('/api/projects', projectRoutes);

describe('Project Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should return user projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          ownerId: 'user-123',
          isOwner: true,
          permissions: { canRead: true, canWrite: true, canDelete: true, canShare: true },
          collaboratorCount: 0,
          lastModified: new Date(),
          createdAt: new Date()
        }
      ];

      mockProjectService.listUserProjects.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProjects);
      expect(mockProjectService.listUserProjects).toHaveBeenCalledWith('user-123');
    });

    it('should handle service errors', async () => {
      mockProjectService.listUserProjects.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/projects')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to list projects');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new project'
      };

      const mockProject = {
        id: 'project-123',
        ...projectData,
        ownerId: 'user-123',
        collaborators: [],
        fileTree: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectService.createProject.mockResolvedValue(mockProject);

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProject);
      expect(response.body.message).toBe('Project created successfully');
      expect(mockProjectService.createProject).toHaveBeenCalledWith('user-123', projectData);
    });

    it('should handle creation errors', async () => {
      mockProjectService.createProject.mockRejectedValue(new Error('Creation failed'));

      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create project');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a specific project', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        ownerId: 'user-123',
        collaborators: [],
        fileTree: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectService.getProject.mockResolvedValue(mockProject);

      const response = await request(app)
        .get('/api/projects/project-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProject);
      expect(mockProjectService.getProject).toHaveBeenCalledWith('project-123', 'user-123');
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectService.getProject.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/projects/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', async () => {
      const updates = {
        name: 'Updated Project',
        description: 'Updated description'
      };

      const mockProject = {
        id: 'project-123',
        ...updates,
        ownerId: 'user-123',
        collaborators: [],
        fileTree: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProjectService.updateProject.mockResolvedValue(mockProject);

      const response = await request(app)
        .put('/api/projects/project-123')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProject);
      expect(response.body.message).toBe('Project updated successfully');
      expect(mockProjectService.updateProject).toHaveBeenCalledWith('project-123', 'user-123', updates);
    });

    it('should return 404 for unauthorized update', async () => {
      mockProjectService.updateProject.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/projects/project-123')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      mockProjectService.deleteProject.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/projects/project-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');
      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('project-123', 'user-123');
    });

    it('should return 404 for unauthorized deletion', async () => {
      mockProjectService.deleteProject.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/projects/project-123')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('POST /api/projects/:id/share', () => {
    it('should share a project', async () => {
      const shareRequest = {
        collaboratorId: 'collaborator-123',
        permissions: {
          canRead: true,
          canWrite: true,
          canDelete: false,
          canShare: false
        }
      };

      mockProjectService.shareProject.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/projects/project-123/share')
        .send(shareRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project shared successfully');
      expect(mockProjectService.shareProject).toHaveBeenCalledWith('project-123', 'user-123', shareRequest);
    });

    it('should return 404 for unauthorized sharing', async () => {
      mockProjectService.shareProject.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/projects/project-123/share')
        .send({ collaboratorId: 'user-456' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('DELETE /api/projects/:id/collaborators/:collaboratorId', () => {
    it('should remove a collaborator', async () => {
      mockProjectService.removeCollaborator.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/projects/project-123/collaborators/collaborator-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Collaborator removed successfully');
      expect(mockProjectService.removeCollaborator).toHaveBeenCalledWith('project-123', 'user-123', 'collaborator-123');
    });
  });

  describe('GET /api/projects/:id/collaborators', () => {
    it('should return project collaborators', async () => {
      const mockCollaborators = [
        {
          userId: 'collaborator-123',
          username: 'collaborator',
          avatarUrl: '',
          permissions: { canRead: true, canWrite: true, canDelete: false, canShare: false },
          addedAt: new Date()
        }
      ];

      mockProjectService.getProjectCollaborators.mockResolvedValue(mockCollaborators);

      const response = await request(app)
        .get('/api/projects/project-123/collaborators')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCollaborators);
      expect(mockProjectService.getProjectCollaborators).toHaveBeenCalledWith('project-123', 'user-123');
    });
  });
});