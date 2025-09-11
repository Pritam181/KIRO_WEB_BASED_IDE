import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { config } from './environment';
import { UserService } from '../services/userService';
import { GitHubProfile } from '../types/user';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserService.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GitHub OAuth Strategy - only configure if credentials are available
if (config.github.clientId && config.github.clientSecret) {
  passport.use(new GitHubStrategy({
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackUrl,
    scope: ['user:email']
  }, async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      // Transform GitHub profile to our format
      const githubProfile: GitHubProfile = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        emails: profile.emails || [],
        photos: profile.photos || [],
        profileUrl: profile.profileUrl
      };

      // Check if user already exists
      let user = await UserService.findByGithubId(githubProfile.id);

      if (user) {
        // Update last login time
        await UserService.updateLastLogin(user.id);
      } else {
        // Create new user
        user = await UserService.createFromGitHub(githubProfile);
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.warn('⚠️  GitHub OAuth not configured - GitHub authentication will not be available');
}

export default passport;