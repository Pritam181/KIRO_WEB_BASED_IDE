import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useCodeEditor } from '../useCodeEditor';

// Mock Monaco Editor
const mockEditor = {
  trigger: vi.fn(),
  getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
  getSelection: vi.fn(() => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 })),
  onDidChangeCursorPosition: vi.fn(),
  onDidChangeCursorSelection: vi.fn(),
};

describe('useCodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useCodeEditor());

    expect(result.current.editorState).toEqual({
      isDirty: false,
      lastSaved: null,
      content: '',
      cursorPosition: null,
      selection: null,
    });
    expect(result.current.isSaving).toBe(false);
  });

  it('handles content changes', () => {
    const onContentChange = vi.fn();
    const { result } = renderHook(() => useCodeEditor({ onContentChange }));

    act(() => {
      result.current.handleContentChange('new content');
    });

    expect(result.current.editorState.content).toBe('new content');
    expect(result.current.editorState.isDirty).toBe(true);
    expect(onContentChange).toHaveBeenCalledWith('new content');
  });

  it('handles manual save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCodeEditor({ onSave }));

    // Make content dirty first
    act(() => {
      result.current.handleContentChange('content to save');
    });

    expect(result.current.editorState.isDirty).toBe(true);

    // Save the content
    await act(async () => {
      await result.current.saveFile();
    });

    expect(onSave).toHaveBeenCalledWith('content to save');
    expect(result.current.editorState.isDirty).toBe(false);
    expect(result.current.editorState.lastSaved).toBeInstanceOf(Date);
  });

  it('handles auto-save with debouncing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useCodeEditor({ 
        autoSave: true, 
        autoSaveDelay: 1000, 
        onSave 
      })
    );

    act(() => {
      result.current.handleContentChange('auto save content');
    });

    expect(result.current.editorState.isDirty).toBe(true);
    expect(onSave).not.toHaveBeenCalled();

    // Fast-forward time to trigger auto-save
    await act(async () => {
      vi.advanceTimersByTime(1000);
      // Wait for the promise to resolve
      await vi.runAllTimersAsync();
    });

    expect(onSave).toHaveBeenCalledWith('auto save content');
    expect(result.current.editorState.isDirty).toBe(false);
  }, 10000);

  it('debounces auto-save correctly', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useCodeEditor({ 
        autoSave: true, 
        autoSaveDelay: 1000, 
        onSave 
      })
    );

    // Make multiple rapid changes
    act(() => {
      result.current.handleContentChange('content 1');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.handleContentChange('content 2');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.handleContentChange('content 3');
    });

    // Only the last change should be saved after the full delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('content 3');
    });
  });

  it('handles save errors gracefully', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useCodeEditor({ onSave }));

    act(() => {
      result.current.handleContentChange('content');
    });

    await act(async () => {
      try {
        await result.current.saveFile();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(consoleSpy).toHaveBeenCalledWith('Save failed:', expect.any(Error));
    expect(result.current.editorState.isDirty).toBe(true); // Should remain dirty on error
    expect(result.current.isSaving).toBe(false);

    consoleSpy.mockRestore();
  });

  it('sets editor reference and updates cursor state', () => {
    const { result } = renderHook(() => useCodeEditor());

    act(() => {
      result.current.setEditorRef(mockEditor as any);
    });

    expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled();
    expect(mockEditor.onDidChangeCursorSelection).toHaveBeenCalled();
  });

  it('provides editor commands', () => {
    const { result } = renderHook(() => useCodeEditor());

    act(() => {
      result.current.setEditorRef(mockEditor as any);
    });

    // Test undo command
    act(() => {
      result.current.editorCommands.undo();
    });

    expect(mockEditor.trigger).toHaveBeenCalledWith('keyboard', 'undo', {});

    // Test redo command
    act(() => {
      result.current.editorCommands.redo();
    });

    expect(mockEditor.trigger).toHaveBeenCalledWith('keyboard', 'redo', {});

    // Test format document command
    act(() => {
      result.current.editorCommands.formatDocument();
    });

    expect(mockEditor.trigger).toHaveBeenCalledWith('keyboard', 'editor.action.formatDocument', {});
  });

  it('does not save when content is not dirty', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useCodeEditor({ onSave }));

    // Try to save without making any changes
    await act(async () => {
      await result.current.saveFile();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });
});