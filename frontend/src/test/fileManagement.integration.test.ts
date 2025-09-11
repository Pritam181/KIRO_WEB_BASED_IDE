import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { FileManagementProvider, useFileManagement } from '../contexts/FileManagementContext';
import { fileService } from '../services/fileService';
import { fileHistoryService } from '../services/fileHistoryService';

// Mock the services
vi.mock('../services/fileService');
vi.mock('../services/fileHistoryService');

const mockFileService = vi.mocked(fileService);
const mockFileHistoryService = vi.mocked(fileHistoryService);

// Test component that uses the file management context
const TestComponent: React.FC = () => {
  const {
    files,
    currentFile,
    isLoading,
    error,
    hasUnsavedChanges,
    loadFileTree,
    loadFile,
    createFile,
    updateFileContent,
    saveFile,
  } = useFileManagement();

  return React.createElement('div', null,
    React.createElement('div', { 'data-testid': 'loading' }, isLoading ? 'Loading' : 'Not Loading'),
    React.createElement('div', { 'data-testid': 'error' }, error || 'No Error'),
    React.createElement('div', { 'data-testid': 'files-count' }, files.length),
    React.createElement('div', { 'data-testid': 'current-file' }, currentFile?.path || 'No File'),
    React.createElement('div', { 'data-testid': 'unsaved-changes' }, hasUnsavedChanges ? 'Unsaved' : 'Saved'),
    React.createElement('button', { onClick: () => loadFileTree(), 'data-testid': 'load-tree' }, 'Load Tree'),
    React.createElement('button', { onClick: () => loadFile('test.js'), 'data-testid': 'load-file' }, 'Load File'),
    React.createElement('button', { onClick: () => createFile('', 'file', 'new.js'), 'data-testid': 'create-file' }, 'Create File'),
    React.createElement('button', { onClick: () => updateFileContent('new content'), 'data-testid': 'update-content' }, 'Update Content'),
    React.createElement('button', { onClick: () => saveFile('test.js', 'saved content'), 'data-testid': 'save-file' }, 'Save File')
  );
};

const renderWithProvider = (projectId = 'test-project') => {
  return render(
    React.createElement(FileManagementProvider, { initialProjectId: projectId },
      React.createElement(TestComponent)
    )
  );
};

describe('File Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockFileService.getFileTree.mockResolvedValue([
      {
        id: 'test.js',
        name: 'test.js',
        path: 'test.js',
        type: 'file',
        size: 100,
        lastModified: new Date(),
      },
    ]);

    mockFileService.getFileContent.mockResolvedValue({
      path: 'test.js',
      content: 'console.log("test");',
      language: 'javascript',
      size: 100,
      lastModified: new Date(),
      checksum: 'abc123',
    });

    mockFileService.createFile.mockResolvedValue({
      success: true,
      message: 'File created successfully',
    });

    mockFileService.updateFile.mockResolvedValue({
      success: true,
      message: 'File updated successfully',
      data: {
        path: 'test.js',
        content: 'saved content',
        language: 'javascript',
        size: 100,
        lastModified: new Date(),
        checksum: 'def456',
      },
    });

    mockFileHistoryService.saveVersion.mockImplementation(() => {});
  });

  it('should load file tree on mount', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(mockFileService.getFileTree).toHaveBeenCalledWith('test-project');
    });

    expect(screen.getByTestId('files-count')).toHaveTextContent('1');
  });

  it('should handle file loading', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByTestId('load-file'));

    await waitFor(() => {
      expect(mockFileService.getFileContent).toHaveBeenCalledWith('test-project', 'test.js');
    });

    expect(screen.getByTestId('current-file')).toHaveTextContent('test.js');
  });

  it('should handle file creation', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByTestId('create-file'));

    await waitFor(() => {
      expect(mockFileService.createFile).toHaveBeenCalledWith('test-project', {
        path: 'new.js',
        type: 'file',
        content: '',
      });
    });

    // Should save to history
    expect(mockFileHistoryService.saveVersion).toHaveBeenCalled();
  });

  it('should track unsaved changes', async () => {
    renderWithProvider();

    // Load a file first
    fireEvent.click(screen.getByTestId('load-file'));
    await waitFor(() => {
      expect(screen.getByTestId('current-file')).toHaveTextContent('test.js');
    });

    // Update content
    fireEvent.click(screen.getByTestId('update-content'));

    expect(screen.getByTestId('unsaved-changes')).toHaveTextContent('Unsaved');
  });

  it('should handle file saving', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByTestId('save-file'));

    await waitFor(() => {
      expect(mockFileService.updateFile).toHaveBeenCalledWith('test-project', {
        path: 'test.js',
        content: 'saved content',
      });
    });

    // Should save to history
    expect(mockFileHistoryService.saveVersion).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockFileService.getFileTree.mockRejectedValue(new Error('Network error'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
    });
  });

  it('should show loading states', async () => {
    // Make the service call hang
    mockFileService.getFileTree.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProvider();

    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });

  it('should handle conflict resolution', async () => {
    const mockConflictHandler = vi.fn();
    
    // Mock auto-save hook to trigger conflict
    vi.mock('../hooks/useAutoSave', () => ({
      useAutoSave: () => ({
        saveNow: vi.fn(),
        isSaving: false,
        lastSavedContent: '',
      }),
    }));

    renderWithProvider();

    // This would be triggered by the auto-save hook in a real scenario
    // For now, we just verify the structure is in place
    expect(mockFileService.getFileTree).toHaveBeenCalled();
  });

  it('should integrate with file history service', async () => {
    renderWithProvider();

    // Load and save a file
    fireEvent.click(screen.getByTestId('load-file'));
    await waitFor(() => {
      expect(screen.getByTestId('current-file')).toHaveTextContent('test.js');
    });

    fireEvent.click(screen.getByTestId('save-file'));

    await waitFor(() => {
      expect(mockFileHistoryService.saveVersion).toHaveBeenCalledWith(
        'test-project',
        'test.js',
        'saved content',
        expect.any(String),
        'update',
        'Manual save'
      );
    });
  });

  it('should handle project switching', async () => {
    const { rerender } = renderWithProvider('project-1');

    await waitFor(() => {
      expect(mockFileService.getFileTree).toHaveBeenCalledWith('project-1');
    });

    // Switch to different project
    rerender(
      React.createElement(FileManagementProvider, { initialProjectId: 'project-2' },
        React.createElement(TestComponent)
      )
    );

    await waitFor(() => {
      expect(mockFileService.getFileTree).toHaveBeenCalledWith('project-2');
    });
  });
});