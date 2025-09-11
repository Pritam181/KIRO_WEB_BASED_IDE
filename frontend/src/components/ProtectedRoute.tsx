import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if we're in demo mode
  const isDemoMode = searchParams.get('demo') === 'true';

  if (isLoading && !isDemoMode) {
    return <LoadingPage text="Checking authentication..." />;
  }

  if (!isAuthenticated && !isDemoMode) {
    // For development, allow access without authentication
    if (process.env.NODE_ENV === 'development') {
      // Allow access in development mode
    } else {
      // Redirect to login page with return url in production
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};