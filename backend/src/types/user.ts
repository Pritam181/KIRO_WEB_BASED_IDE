export interface User {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface GitHubProfile {
  id: string;
  username: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
  profileUrl: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: User;
}