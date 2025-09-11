import { useCallback, useEffect, useRef } from 'react';
import { fileService } from '../services/fileService';

export interface AutoSaveOptions {
  projectId: string;
  filePath: string;
  content: string;
  enabled?: boolean;
  debounceMs?: number;
  onSave?: (success: boolean, error?: string) => void;
  onConflict?: (serverContent: string, localContent: string) => void;
}

export const useAutoSave = ({
  projectId,
  filePath,
  content,
  enabled = true,
  debounceMs = 2000,
  onSave,
  onConflict,
}: AutoSaveOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedContentRef = useRef<string>('');
  const lastSavedChecksumRef = useRef<string>('');
  const isSavingRef = useRef<boolean>(false);

  const saveFile = useCallback(async (contentToSave: string) => {
    if (isSavingRef.current || !enabled || !projectId || !filePath) {
      return;
    }

    try {
      isSavingRef.current = true;

      // Check for conflicts before saving
      try {
        const currentFile = await fileService.getFileContent(projectId, filePath);
        
        // If the file has been modified by someone else since our last save
        if (lastSavedChecksumRef.current && 
            currentFile.checksum !== lastSavedChecksumRef.current &&
            currentFile.content !== lastSavedContentRef.current) {
          
          // Conflict detected
          if (onConflict) {
            onConflict(currentFile.content, contentToSave);
            return;
          }
        }
      } catch (error) {
        // File might not exist yet, continue with save
        console.warn('Could not check for conflicts:', error);
      }

      const result = await fileService.updateFile(projectId, {
        path: filePath,
        content: contentToSave,
      });

      if (result.success && result.data) {
        lastSavedContentRef.current = contentToSave;
        lastSavedChecksumRef.current = (result.data as any).checksum || '';
        onSave?.(true);
      } else {
        onSave?.(false, result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onSave?.(false, errorMessage);
    } finally {
      isSavingRef.current = false;
    }
  }, [projectId, filePath, enabled, onSave, onConflict]);

  const debouncedSave = useCallback((contentToSave: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveFile(contentToSave);
    }, debounceMs);
  }, [saveFile, debounceMs]);

  // Auto-save when content changes
  useEffect(() => {
    if (content !== lastSavedContentRef.current && content.trim() !== '') {
      debouncedSave(content);
    }
  }, [content, debouncedSave]);

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return saveFile(content);
  }, [saveFile, content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveNow,
    isSaving: isSavingRef.current,
    lastSavedContent: lastSavedContentRef.current,
  };
};