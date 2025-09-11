import { projectService } from '../services/projectService';
import { CreateProjectRequest, UpdateProjectRequest } from '../types/project';
import fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ProjectService', () => {
  const mockUserId = 'user-123';
  const mockProjectData: CreateProjectRequest = {
    name: 'Test Project',
    description: 'A test project'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const project = await projectService.createProject(mockUserId, mockProjectData);

      expect(project).toMatchObject({
        name: mockProjectData.name,
        description: mockProjectData.description,
        ownerId: mockUserId,
        collaborators: []
      });
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getProject', () => {
    it('should return null for non-existent project', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const project = await projectService.getProject('non-existent', mockUserId);

      expect(project).toBeNull();
    });
  });

  describe('listUserProjects', () => {
    it('should return empty array when no projects exist', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const projects = await projectService.listUserProjects(mockUserId);

      expect(projects).toEqual([]);
    });
  });
});