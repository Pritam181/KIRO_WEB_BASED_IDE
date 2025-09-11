import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, error, setUser, setLoading, logout: storeLogout } = useAuthStore();

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = async () => {
      if (isAuthenticated && user) {
        setLoading(true);
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.error('Failed to verify authentication:', err);
          storeLogout();
        } finally {
          setLoading(false);
        }
      }
    };

    checkAuth();
  }, []);

  const login = (returnTo?: string) => {
    // Store return URL for after authentication
    if (returnTo) {
      sessionStorage.setItem('auth-return-to', returnTo);
    }
    // Redirect to GitHub OAuth
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/github`;
  };

  const logout = async () => {
    try {
      await authService.logout();
      storeLogout();
    } catch (err) {
      console.error('Logout failed:', err);
      // Force logout even if API call fails
      storeLogout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};