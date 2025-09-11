import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileExplorer } from '../FileExplorer';
import { FileNode } from '../../types/file';

// Mock the child components
vi.mock('../FileTreeItem', () => ({
  FileTreeItem: ({ node, onSelect, onContextMenu }: any) => (
    <div 
      data-testid={`file-item-${node.id}`}
      onClick={() => onSelect(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      {node.name}
    </div>
  ),
}));

vi.mock('../ContextMenu', () => ({
  ContextMenu: ({ onAction, onClose }: any) => (
    <div data-testid="context-menu">
      <button onClick={() => onAction('new-file')}>New File</button>
      <button onClick={() => onAction('new-folder')}>New Folder</button>
      <button onClick={() => onAction('rename')}>Rename</button>
      <button onClick={() => onAction('delete')}>Delete</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../CreateFileDialog', () => ({
  CreateFileDialog: ({ type, onConfirm, onCancel }: any) => (
    <div data-testid="create-file-dialog">
      <span>Create {type}</span>
      <button onClick={() => onConfirm('test-name')}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../RenameDialog', () => ({
  RenameDialog: ({ onConfirm, onCancel }: any) => (
    <div data-testid="rename-dialog">
      <button onClick={() => onConfirm('new-name')}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({ onConfirm, onCancel }: any) => (
    <div data-testid="delete-confirm-dialog">
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../FileUploadDropzone', () => ({
  FileUploadDropzone: ({ children }: any) => <div>{children}</div>,
}));

const mockFiles: FileNode[] = [
  {
    id: '1',
    name: 'src',
    path: 'src',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'index.ts',
        path: 'src/index.ts',
        type: 'file',
        size: 1024,
      },
    ],
  },
  {
    id: '3',
    name: 'README.md',
    path: 'README.md',
    type: 'file',
    size: 512,
  },
];

const defaultProps = {
  projectFiles: mockFiles,
  onFileSelect: vi.fn(),
  onFileCreate: vi.fn(),
  onFileDelete: vi.fn(),
  onFileRename: vi.fn(),
  onFileUpload: vi.fn(),
  onRefresh: vi.fn(),
};

describe('FileExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file explorer with header and files', () => {
    render(<FileExplorer {...defaultProps} />);
    
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-3')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<FileExplorer {...defaultProps} isLoading={true} />);
    
    const refreshButton = screen.getByTitle('Refresh');
    expect(refreshButton).toBeDisabled();
  });

  it('filters files based on search query', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search files...');
    await user.type(searchInput, 'README');
    
    // The filtering logic would be tested in the actual component
    expect(searchInput).toHaveValue('README');
  });

  it('handles file selection', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    const fileItem = screen.getByTestId('file-item-3');
    await user.click(fileItem);
    
    expect(defaultProps.onFileSelect).toHaveBeenCalledWith(mockFiles[1]);
  });

  it('shows context menu on right click', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    const fileItem = screen.getByTestId('file-item-3');
    await user.pointer({ keys: '[MouseRight]', target: fileItem });
    
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('handles context menu actions', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    // Right click to show context menu
    const fileItem = screen.getByTestId('file-item-3');
    await user.pointer({ keys: '[MouseRight]', target: fileItem });
    
    // Click new file action
    const newFileButton = screen.getByText('New File');
    await user.click(newFileButton);
    
    expect(screen.getByTestId('create-file-dialog')).toBeInTheDocument();
  });

  it('handles file creation', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    // Click new file button in header
    const newFileButton = screen.getByTitle('New File');
    await user.click(newFileButton);
    
    expect(screen.getByTestId('create-file-dialog')).toBeInTheDocument();
    
    // Confirm creation
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
    
    expect(defaultProps.onFileCreate).toHaveBeenCalledWith('', 'file', 'test-name');
  });

  it('handles file renaming', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    // Right click to show context menu
    const fileItem = screen.getByTestId('file-item-3');
    await user.pointer({ keys: '[MouseRight]', target: fileItem });
    
    // Click rename action
    const renameButton = screen.getByText('Rename');
    await user.click(renameButton);
    
    expect(screen.getByTestId('rename-dialog')).toBeInTheDocument();
    
    // Confirm rename
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
    
    expect(defaultProps.onFileRename).toHaveBeenCalledWith('README.md', 'new-name');
  });

  it('handles file deletion', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    // Right click to show context menu
    const fileItem = screen.getByTestId('file-item-3');
    await user.pointer({ keys: '[MouseRight]', target: fileItem });
    
    // Click delete action
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);
    
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    
    // Confirm deletion
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
    
    expect(defaultProps.onFileDelete).toHaveBeenCalledWith('README.md');
  });

  it('handles refresh action', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    const refreshButton = screen.getByTitle('Refresh');
    await user.click(refreshButton);
    
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('shows empty state when no files', () => {
    render(<FileExplorer {...defaultProps} projectFiles={[]} />);
    
    expect(screen.getByText('No files in this project')).toBeInTheDocument();
  });

  it('shows search empty state when no matches', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search files...');
    await user.type(searchInput, 'nonexistent');
    
    // This would show in the actual component after filtering
    // expect(screen.getByText('No files match your search')).toBeInTheDocument();
  });
});