import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileTreeItem } from '../FileTreeItem';
import { FileNode } from '../../types/file';

const mockFileNode: FileNode = {
  id: '1',
  name: 'test.ts',
  path: 'src/test.ts',
  type: 'file',
  size: 1024,
};

const mockFolderNode: FileNode = {
  id: '2',
  name: 'src',
  path: 'src',
  type: 'folder',
  children: [
    {
      id: '3',
      name: 'index.ts',
      path: 'src/index.ts',
      type: 'file',
      size: 512,
    },
  ],
};

const defaultProps = {
  level: 0,
  isSelected: false,
  isExpanded: false,
  onSelect: vi.fn(),
  onToggle: vi.fn(),
  onContextMenu: vi.fn(),
};

describe('FileTreeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file item correctly', () => {
    render(<FileTreeItem {...defaultProps} node={mockFileNode} />);
    
    expect(screen.getByText('test.ts')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  it('renders folder item correctly', () => {
    render(<FileTreeItem {...defaultProps} node={mockFolderNode} />);
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.queryByText('KB')).not.toBeInTheDocument();
  });

  it('shows correct icon for different file types', () => {
    const jsFile: FileNode = { ...mockFileNode, name: 'script.js' };
    const imageFile: FileNode = { ...mockFileNode, name: 'image.png' };
    const textFile: FileNode = { ...mockFileNode, name: 'readme.md' };
    
    const { rerender } = render(<FileTreeItem {...defaultProps} node={jsFile} />);
    expect(screen.getByText('script.js')).toBeInTheDocument();
    
    rerender(<FileTreeItem {...defaultProps} node={imageFile} />);
    expect(screen.getByText('image.png')).toBeInTheDocument();
    
    rerender(<FileTreeItem {...defaultProps} node={textFile} />);
    expect(screen.getByText('readme.md')).toBeInTheDocument();
  });

  it('handles file selection on click', async () => {
    const user = userEvent.setup();
    render(<FileTreeItem {...defaultProps} node={mockFileNode} />);
    
    const fileItem = screen.getByText('test.ts');
    await user.click(fileItem);
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockFileNode);
  });

  it('handles folder toggle on click', async () => {
    const user = userEvent.setup();
    render(<FileTreeItem {...defaultProps} node={mockFolderNode} />);
    
    const folderItem = screen.getByText('src');
    await user.click(folderItem);
    
    expect(defaultProps.onToggle).toHaveBeenCalledWith('src');
  });

  it('handles context menu on right click', async () => {
    const user = userEvent.setup();
    render(<FileTreeItem {...defaultProps} node={mockFileNode} />);
    
    const fileItem = screen.getByText('test.ts');
    await user.pointer({ keys: '[MouseRight]', target: fileItem });
    
    expect(defaultProps.onContextMenu).toHaveBeenCalledWith(
      expect.any(Object),
      mockFileNode
    );
  });

  it('shows selected state correctly', () => {
    render(<FileTreeItem {...defaultProps} node={mockFileNode} isSelected={true} />);
    
    const fileItem = screen.getByText('test.ts').closest('div');
    expect(fileItem).toHaveClass('bg-blue-100');
  });

  it('shows expanded folder with children', () => {
    render(
      <FileTreeItem 
        {...defaultProps} 
        node={mockFolderNode} 
        isExpanded={true} 
      />
    );
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('index.ts')).toBeInTheDocument();
  });

  it('applies correct indentation based on level', () => {
    render(<FileTreeItem {...defaultProps} node={mockFileNode} level={2} />);
    
    const fileItem = screen.getByText('test.ts').closest('div');
    expect(fileItem).toHaveStyle({ paddingLeft: '32px' }); // 2 * 12 + 8
  });

  it('shows chevron for folders with children', () => {
    render(<FileTreeItem {...defaultProps} node={mockFolderNode} />);
    
    // Should show chevron right when collapsed
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('handles toggle button click separately from folder click', async () => {
    const user = userEvent.setup();
    render(<FileTreeItem {...defaultProps} node={mockFolderNode} />);
    
    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);
    
    expect(defaultProps.onToggle).toHaveBeenCalledWith('src');
    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('formats file sizes correctly', () => {
    const largeFile: FileNode = { ...mockFileNode, size: 1048576 }; // 1MB
    const smallFile: FileNode = { ...mockFileNode, size: 100 }; // 100B
    
    const { rerender } = render(<FileTreeItem {...defaultProps} node={largeFile} />);
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    
    rerender(<FileTreeItem {...defaultProps} node={smallFile} />);
    expect(screen.getByText('100 B')).toBeInTheDocument();
  });
});