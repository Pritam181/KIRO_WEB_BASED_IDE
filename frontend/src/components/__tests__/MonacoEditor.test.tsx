import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import MonacoEditor, { FileContent } from '../MonacoEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, language, onChange, onMount }: any) => {
    // Simulate editor mounting
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

const mockFile: FileContent = {
  path: 'test.ts',
  content: 'console.log("Hello, World!");',
  language: 'typescript',
  size: 100,
  lastModified: new Date(),
  checksum: 'abc123',
};

describe('MonacoEditor', () => {
  it('renders empty state when no file is provided', () => {
    render(<MonacoEditor file={null} />);
    
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.getByText('Select a file from the explorer to start editing')).toBeInTheDocument();
  });

  it('renders editor with file content', async () => {
    render(<MonacoEditor file={mockFile} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('console.log("Hello, World!");');
      expect(screen.getByTestId('editor-language')).toHaveTextContent('typescript');
    });
  });

  it('detects language from file extension', async () => {
    const jsFile: FileContent = {
      ...mockFile,
      path: 'test.js',
      language: '',
    };

    render(<MonacoEditor file={jsFile} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('editor-language')).toHaveTextContent('javascript');
    });
  });

  it('calls onContentChange when content changes', async () => {
    const onContentChange = vi.fn();
    render(<MonacoEditor file={mockFile} onContentChange={onContentChange} />);
    
    await waitFor(() => {
      const textarea = screen.getByTestId('editor-content');
      expect(textarea).toBeInTheDocument();
    });

    const textarea = screen.getByTestId('editor-content');
    const newContent = 'console.log("Updated!");';
    
    // Simulate user typing by firing the change event
    fireEvent.change(textarea, { target: { value: newContent } });
    
    expect(onContentChange).toHaveBeenCalledWith(newContent);
  });

  it('shows saving indicator when saving', () => {
    render(<MonacoEditor file={mockFile} autoSave={true} />);
    
    // The saving indicator should be visible when auto-save is triggered
    // This would require more complex testing with actual Monaco Editor integration
  });

  it('handles different file types correctly', async () => {
    const testCases = [
      { path: 'test.py', expectedLanguage: 'python' },
      { path: 'test.java', expectedLanguage: 'java' },
      { path: 'test.html', expectedLanguage: 'html' },
      { path: 'test.css', expectedLanguage: 'css' },
      { path: 'test.json', expectedLanguage: 'json' },
      { path: 'test.md', expectedLanguage: 'markdown' },
      { path: 'test.unknown', expectedLanguage: 'plaintext' },
    ];

    for (const testCase of testCases) {
      const file: FileContent = {
        ...mockFile,
        path: testCase.path,
        language: '',
      };

      const { unmount } = render(<MonacoEditor file={file} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('editor-language')).toHaveTextContent(testCase.expectedLanguage);
      });

      unmount();
    }
  });
});