import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Github, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/workspace';
    return <Navigate to={from} replace />;
  }

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'oauth_not_configured':
        return 'GitHub OAuth is not configured. Please contact your administrator.';
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to Kiro
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            AI-powered web development environment
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{errorMessage}</span>
            </div>
          )}
          
          <button
            onClick={login}
            disabled={error === 'oauth_not_configured'}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or for demo
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              // Direct navigation to workspace with demo mode
              window.location.href = '/workspace?demo=true';
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
          >
            <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded text-xs font-bold">
              D
            </span>
            Try Demo Mode
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="space-y-1 text-xs">
              <li>• AI-powered code assistance</li>
              <li>• Real-time collaboration</li>
              <li>• Integrated terminal and debugging</li>
              <li>• One-click GitHub integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};