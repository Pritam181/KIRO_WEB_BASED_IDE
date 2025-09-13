import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { ProjectContext } from '../types/chat';

export const useProjectContext = () => {
  const location = useLocation();
  const { setProjectContext } = useChatStore();

  useEffect(() => {
    // Extract project context from current route and state
    const updateContext = () => {
      // This is a simplified implementation
      // In a real app, you'd get this from your project/file management state
      const context: ProjectContext = {
        projectId: 'current-project', // TODO: Get from actual project state
        currentFile: undefined, // TODO: Get from editor state
        selectedText: undefined, // TODO: Get from editor selection
        openFiles: [], // TODO: Get from open tabs
      };

      setProjectContext(context);
    };

    updateContext();
  }, [location, setProjectContext]);

  return {
    updateProjectContext: (updates: Partial<ProjectContext>) => {
      const currentContext = useChatStore.getState().projectContext;
      if (currentContext) {
        setProjectContext({ ...currentContext, ...updates });
      }
    },
  };
};