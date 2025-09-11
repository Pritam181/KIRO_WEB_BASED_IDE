import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileExplorer } from '../FileExplorer';
import { FileNode } from '../../types/file';

// Integration test to verify all file explorer components work together
describe('FileExplorer Integration', () => {
  const mockFiles: FileNode[] = [
    {
      id: '1',
      name: 'src',
      path: 'src',
      type: 'folder',
      children: [
        {
          id: '2',
          name: 'components',
          path: 'src/components',
          type: 'folder',
          children: [
            {
              id: '3',
              name: 'Button.tsx',
              path: 'src/components/Button.tsx',
              type: 'file',
              size: 1024,
            },
          ],
        },
        {
          id: '4',
          name: 'index.ts',
          path: 'src/index.ts',
          type: 'file',
          size: 512,
        },
      ],
    },
    {
      id: '5',
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      size: 256,
    },
  ];

  const mockProps = {
    projectFiles: mockFiles,
    onFileSelect: vi.fn(),
    onFileCreate: vi.fn(),
    onFileDelete: vi.fn(),
    onFileRename: vi.fn(),
    onFileUpload: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays complete file tree with proper hierarchy', () => {
    render(<FileExplorer {...mockProps} />);
    
    // Check that all files and folders are displayed
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
    
    // Initially, nested folders should not be visible (collapsed)
    expect(screen.queryByText('components')).not.toBeInTheDocument();
    expect(screen.queryByText('Button.tsx')).not.toBeInTheDocument();
  });

  it('expands and collapses folders correctly', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...mockProps} />);
    
    // Click on src folder to expand it
    const srcFolder = screen.getByText('src');
    await user.click(srcFolder);
    
    // Now components folder and index.ts should be visible
    await waitFor(() => {
      expect(screen.getByText('components')).toBeInTheDocument();
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });
    
    // Click on components folder to expand it
    const componentsFolder = screen.getByText('components');
    await user.click(componentsFolder);
    
    // Now Button.tsx should be visible
    await waitFor(() => {
      expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    });
  });

  it('handles file selection across different levels', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...mockProps} />);
    
    // Select a top-level file
    const readmeFile = screen.getByText('README.md');
    await user.click(readmeFile);
    
    expect(mockProps.onFileSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'README.md', type: 'file' })
    );
    
    // Expand src folder and select a nested file
    const srcFolder = screen.getByText('src');
    await user.click(srcFolder);
    
    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });
    
    const indexFile = screen.getByText('index.ts');
    await user.click(indexFile);
    
    expect(mockProps.onFileSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'index.ts', type: 'file' })
    );
  });

  it('shows context menu with appropriate actions for files and folders', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...mockProps} />);
    
    // Right-click on a file
    const readmeFile = screen.getByText('README.md');
    await user.pointer({ keys: '[MouseRight]', target: readmeFile });
    
    // Context menu should appear with file-specific actions
    await waitFor(() => {
      expect(screen.getByText('New File')).toBeInTheDocument();
      expect(screen.getByText('New Folder')).toBeInTheDocument();
      expect(screen.getByText('Rename')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('handles search functionality across nested files', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search files...');
    
    // Search for a nested file
    await user.type(searchInput, 'Button');
    
    // The search input should have the value
    expect(searchInput).toHaveValue('Button');
    
    // Clear search
    await user.clear(searchInput);
    await user.type(searchInput, 'README');
    
    expect(searchInput).toHaveValue('README');
  });

  it('provides comprehensive file management through header buttons', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...mockProps} />);
    
    // Test new file button
    const newFileButton = screen.getByTitle('New File');
    await user.click(newFileButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New File')).toBeInTheDocument();
    });
    
    // Cancel the dialog
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    // Test new folder button
    const newFolderButton = screen.getByTitle('New Folder');
    await user.click(newFolderButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    });
  });

  it('handles drag and drop upload area', () => {
    render(<FileExplorer {...mockProps} />);
    
    // The file explorer should be wrapped in a drop zone
    // This is tested more thoroughly in FileUploadDropzone tests
    const explorer = screen.getByText('Explorer').closest('div');
    expect(explorer).toBeInTheDocument();
  });

  it('shows appropriate empty states', () => {
    render(<FileExplorer {...mockProps} projectFiles={[]} />);
    
    expect(screen.getByText('No files in this project')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    render(<FileExplorer {...mockProps} isLoading={true} />);
    
    const refreshButton = screen.getByTitle('Refresh');
    expect(refreshButton).toBeDisabled();
  });
});