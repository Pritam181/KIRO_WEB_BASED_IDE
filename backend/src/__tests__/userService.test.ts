import { UserService } from '../services/userService';

describe('UserService', () => {
  beforeEach(() => {
    // Clear any existing users
    jest.clearAllMocks();
  });

  describe('createFromGitHub', () => {
    it('should create a new user from GitHub profile', async () => {
      const githubProfile = {
        id: '12345',
        username: 'testuser',
        displayName: 'Test User',
        emails: [{ value: 'test@example.com', verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser'
      };

      const user = await UserService.createFromGitHub(githubProfile);

      expect(user).toMatchObject({
        githubId: '12345',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://avatar.url'
      });
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should handle missing email and avatar', async () => {
      const githubProfile = {
        id: '12345',
        username: 'testuser',
        displayName: 'Test User',
        emails: [],
        photos: [],
        profileUrl: 'https://github.com/testuser'
      };

      const user = await UserService.createFromGitHub(githubProfile);

      expect(user.email).toBe('');
      expect(user.avatarUrl).toBe('');
    });
  });

  describe('findById', () => {
    it('should return null for non-existent user', async () => {
      const user = await UserService.findById('non-existent');
      expect(user).toBeNull();
    });

    it('should return user if exists', async () => {
      const githubProfile = {
        id: '12345',
        username: 'testuser',
        displayName: 'Test User',
        emails: [{ value: 'test@example.com', verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser'
      };

      const createdUser = await UserService.createFromGitHub(githubProfile);
      const foundUser = await UserService.findById(createdUser.id);

      expect(foundUser).toEqual(createdUser);
    });
  });

  describe('findByGithubId', () => {
    it('should return null for non-existent GitHub ID', async () => {
      const user = await UserService.findByGithubId('non-existent');
      expect(user).toBeNull();
    });

    it('should return user if GitHub ID exists', async () => {
      const githubProfile = {
        id: '12345',
        username: 'testuser',
        displayName: 'Test User',
        emails: [{ value: 'test@example.com', verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser'
      };

      const createdUser = await UserService.createFromGitHub(githubProfile);
      const foundUser = await UserService.findByGithubId('12345');

      expect(foundUser).toEqual(createdUser);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', async () => {
      const githubProfile = {
        id: '12345',
        username: 'testuser',
        displayName: 'Test User',
        emails: [{ value: 'test@example.com', verified: true }],
        photos: [{ value: 'https://avatar.url' }],
        profileUrl: 'https://github.com/testuser'
      };

      const user = await UserService.createFromGitHub(githubProfile);
      const originalLoginTime = user.lastLoginAt;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await UserService.updateLastLogin(user.id);
      const updatedUser = await UserService.findById(user.id);

      expect(updatedUser?.lastLoginAt.getTime()).toBeGreaterThan(originalLoginTime.getTime());
    });
  });
});