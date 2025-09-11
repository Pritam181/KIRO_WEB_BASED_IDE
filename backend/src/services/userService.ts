import { User, GitHubProfile } from '../types/user';

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();
const usersByGithubId: Map<string, User> = new Map();

export class UserService {
  static async findById(id: string): Promise<User | null> {
    return users.get(id) || null;
  }

  static async findByGithubId(githubId: string): Promise<User | null> {
    return usersByGithubId.get(githubId) || null;
  }

  static async createFromGitHub(profile: GitHubProfile): Promise<User> {
    const user: User = {
      id: this.generateId(),
      githubId: profile.id,
      username: profile.username,
      email: profile.emails?.[0]?.value || '',
      avatarUrl: profile.photos?.[0]?.value || '',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    users.set(user.id, user);
    usersByGithubId.set(user.githubId, user);

    return user;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    const user = users.get(userId);
    if (user) {
      user.lastLoginAt = new Date();
      users.set(userId, user);
    }
  }

  static async getAllUsers(): Promise<User[]> {
    return Array.from(users.values());
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}