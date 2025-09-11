import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EditorDemo from '../EditorDemo';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, language, onChange, onMount }: any) => {
    React.useEffect(() => {
      if (onMount) {
        const mockEditor = {
          updateOptions: vi.fn(),
          addCommand: vi.fn(),
          focus: vi.fn(),
          trigger: vi.fn(),
          getValue: () => value,
          onDidChangeCursorPosition: vi.fn(),
          onDidChangeCursorSelection: vi.fn(),
          getPosition: () => ({ lineNumber: 1, column: 1 }),
          getSelection: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }),
        };
        const mockMonaco = {
          KeyMod: { CtrlCmd: 1, Shift: 2, Alt: 4 },
          KeyCode: { KeyS: 1, KeyZ: 2, KeyY: 3 },
          editor: { defineTheme: vi.fn() },
          languages: {
            typescript: {
              typescriptDefaults: {
                setCompilerOptions: vi.fn(),
                setDiagnosticsOptions: vi.fn(),
              },
              javascriptDefaults: {
                setCompilerOptions: vi.fn(),
                setDiagnosticsOptions: vi.fn(),
              },
            },
            json: {
              jsonDefaults: {
                setDiagnosticsOptions: vi.fn(),
              },
            },
          },
        };
        onMount(mockEditor, mockMonaco);
      }
    }, [onMount]);

    return (
      <div data-testid="monaco-editor">
        <div data-testid="editor-language">{language}</div>
        <textarea
          data-testid="editor-content"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    );
  },
}));

describe('EditorDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor demo with file explorer', () => {
    render(<EditorDemo />);
    
    expect(screen.getByText('Monaco Editor Demo')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('example.ts')).toBeInTheDocument();
    expect(screen.getByText('example.js')).toBeInTheDocument();
    expect(screen.getByText('example.py')).toBeInTheDocument();
    expect(screen.getByText('example.json')).toBeInTheDocument();
  });

  it('switches between files when clicked', async () => {
    render(<EditorDemo />);
    
    // Initially TypeScript file should be selected
    expect(screen.getByText('Current file: example.ts')).toBeInTheDocument();
    expect(screen.getByText('Language: typescript')).toBeInTheDocument();
    
    // Click on JavaScript file
    fireEvent.click(screen.getByText('example.js'));
    
    await waitFor(() => {
      expect(screen.getByText('Current file: example.js')).toBeInTheDocument();
      expect(screen.getByText('Language: javascript')).toBeInTheDocument();
    });
  });

  it('displays keyboard shortcuts in the sidebar', () => {
    render(<EditorDemo />);
    
    expect(screen.getByText('Keyboard Shortcuts:')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.getByText('Find')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
  });

  it('shows editor content for different file types', async () => {
    render(<EditorDemo />);
    
    // Check TypeScript content
    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent.value).toContain('interface User');
    
    // Switch to Python file
    fireEvent.click(screen.getByText('example.py'));
    
    await waitFor(() => {
      const editorContent = screen.getByTestId('editor-content');
      expect(editorContent.value).toContain('def quicksort');
    });
  });

  it('updates save count when content changes', async () => {
    vi.useFakeTimers();
    
    render(<EditorDemo />);
    
    // Initially save count should be 0
    expect(screen.getByText('Save count: 0')).toBeInTheDocument();
    
    // Change content to trigger auto-save
    const editorContent = screen.getByTestId('editor-content');
    fireEvent.change(editorContent, { target: { value: 'console.log("test");' } });
    
    // Fast-forward time to trigger auto-save
    await vi.runAllTimersAsync();
    
    await waitFor(() => {
      expect(screen.getByText('Save count: 1')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    vi.useRealTimers();
  }, 15000);

  it('shows status information in the status bar', () => {
    render(<EditorDemo />);
    
    expect(screen.getByText(/Monaco Editor integrated with TypeScript support/)).toBeInTheDocument();
  });

  it('handles file switching correctly', async () => {
    render(<EditorDemo />);
    
    const files = ['example.js', 'example.py', 'example.json'];
    const languages = ['javascript', 'python', 'json'];
    
    for (let i = 0; i < files.length; i++) {
      fireEvent.click(screen.getByText(files[i]));
      
      await waitFor(() => {
        expect(screen.getByText(`Current file: ${files[i]}`)).toBeInTheDocument();
        expect(screen.getByText(`Language: ${languages[i]}`)).toBeInTheDocument();
        expect(screen.getByTestId('editor-language')).toHaveTextContent(languages[i]);
      });
    }
  });
});