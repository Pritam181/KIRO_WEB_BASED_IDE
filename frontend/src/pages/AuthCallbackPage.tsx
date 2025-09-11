import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from '../components/LoadingSpinner';
import { authService } from '../services/authService';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setLoading, setError } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        if (error) {
          throw new Error(`Authentication failed: ${error}`);
        }

        // Get user info from backend
        const user = await authService.getCurrentUser();
        setUser(user);

        // Redirect to intended destination or workspace
        const returnTo = sessionStorage.getItem('auth-return-to') || '/workspace';
        sessionStorage.removeItem('auth-return-to');
        navigate(returnTo, { replace: true });
      } catch (err) {
        console.error('Authentication callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, setUser, setLoading, setError]);

  return <LoadingPage text="Completing authentication..." />;
};