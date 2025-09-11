import { useState, useCallback, useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

export interface EditorState {
  isDirty: boolean;
  lastSaved: Date | null;
  content: string;
  cursorPosition: monaco.Position | null;
  selection: monaco.Selection | null;
}

export interface UseCodeEditorOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (content: string) => Promise<void> | void;
  onContentChange?: (content: string) => void;
}

export const useCodeEditor = (options: UseCodeEditorOptions = {}) => {
  const {
    autoSave = false,
    autoSaveDelay = 2000,
    onSave,
    onContentChange,
  } = options;

  const [editorState, setEditorState] = useState<EditorState>({
    isDirty: false,
    lastSaved: null,
    content: '',
    cursorPosition: null,
    selection: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Handle content changes
  const handleContentChange = useCallback(
    (content: string) => {
      setEditorState((prev) => ({
        ...prev,
        content,
        isDirty: content !== prev.content || !prev.lastSaved,
      }));

      onContentChange?.(content);

      // Auto-save logic
      if (autoSave && onSave) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            setIsSaving(true);
            await onSave(content);
            setEditorState((prev) => ({
              ...prev,
              isDirty: false,
              lastSaved: new Date(),
            }));
          } catch (error) {
            console.error('Auto-save failed:', error);
          } finally {
            setIsSaving(false);
          }
        }, autoSaveDelay);
      }
    },
    [autoSave, autoSaveDelay, onSave, onContentChange]
  );

  // Manual save function
  const saveFile = useCallback(async () => {
    if (!onSave || !editorState.isDirty) return;

    try {
      setIsSaving(true);
      await onSave(editorState.content);
      setEditorState((prev) => ({
        ...prev,
        isDirty: false,
        lastSaved: new Date(),
      }));
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [onSave, editorState.content, editorState.isDirty]);

  // Update cursor position and selection
  const updateCursorState = useCallback(() => {
    if (!editorRef.current) return;

    const position = editorRef.current.getPosition();
    const selection = editorRef.current.getSelection();

    setEditorState((prev) => ({
      ...prev,
      cursorPosition: position,
      selection,
    }));
  }, []);

  // Set editor reference
  const setEditorRef = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor | null) => {
      editorRef.current = editor;

      if (editor) {
        // Listen for cursor position changes
        editor.onDidChangeCursorPosition(updateCursorState);
        editor.onDidChangeCursorSelection(updateCursorState);
      }
    },
    [updateCursorState]
  );

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Editor commands
  const editorCommands = {
    save: saveFile,
    undo: () => editorRef.current?.trigger('keyboard', 'undo', {}),
    redo: () => editorRef.current?.trigger('keyboard', 'redo', {}),
    selectAll: () => editorRef.current?.trigger('keyboard', 'editor.action.selectAll', {}),
    find: () => editorRef.current?.trigger('keyboard', 'actions.find', {}),
    replace: () => editorRef.current?.trigger('keyboard', 'editor.action.startFindReplaceAction', {}),
    formatDocument: () => editorRef.current?.trigger('keyboard', 'editor.action.formatDocument', {}),
    commentLine: () => editorRef.current?.trigger('keyboard', 'editor.action.commentLine', {}),
    duplicateLine: () => editorRef.current?.trigger('keyboard', 'editor.action.copyLinesDownAction', {}),
    deleteLine: () => editorRef.current?.trigger('keyboard', 'editor.action.deleteLines', {}),
    goToLine: () => editorRef.current?.trigger('keyboard', 'editor.action.gotoLine', {}),
  };

  return {
    editorState,
    isSaving,
    handleContentChange,
    saveFile,
    setEditorRef,
    editorCommands,
  };
};

export default useCodeEditor;