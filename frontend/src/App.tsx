import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { FileManagementProvider } from './contexts/FileManagementContext';
import { DemoFileManagementProvider } from './contexts/DemoFileManagementContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { EditorPage } from './pages/EditorPage';
import { ChatPage } from './pages/ChatPage';
import { TerminalPage } from './pages/TerminalPage';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle demo vs normal mode
const AppRoutes: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  
  // For development, always use real FileManagementProvider unless explicitly in demo mode
  const FileProvider = isDemoMode ? DemoFileManagementProvider : FileManagementProvider;
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FileProvider>
              <MainLayout />
            </FileProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/workspace" replace />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="terminal" element={<TerminalPage />} />
        <Route path="run" element={<div className="p-4">Run & Debug (Coming Soon)</div>} />
        <Route path="github" element={<div className="p-4">GitHub Integration (Coming Soon)</div>} />
        <Route path="settings" element={<div className="p-4">Settings (Coming Soon)</div>} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;