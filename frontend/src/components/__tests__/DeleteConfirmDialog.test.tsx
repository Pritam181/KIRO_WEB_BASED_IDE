import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';

const defaultProps = {
  fileName: 'test.txt',
  fileType: 'file' as const,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with correct title and content for file', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText('"test.txt"')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('renders dialog with correct title and content for folder', () => {
    render(
      <DeleteConfirmDialog 
        {...defaultProps} 
        fileName="my-folder" 
        fileType="folder" 
      />
    );
    
    expect(screen.getByText('Delete Folder')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText('"my-folder"')).toBeInTheDocument();
    expect(screen.getByText(/This will permanently delete the folder and all its contents/)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(closeButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('handles Escape key to cancel', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.keyDown(deleteButton, { key: 'Escape' });
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('handles Enter key to confirm', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.keyDown(deleteButton, { key: 'Enter' });
    
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('shows warning icon and styling', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    
    // Check for warning/alert styling
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    
    // Check for delete button styling (should be red/danger)
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toHaveClass('bg-red-600');
  });

  it('displays different warning for folder vs file', () => {
    const { rerender } = render(<DeleteConfirmDialog {...defaultProps} />);
    
    // File should not show folder warning
    expect(screen.queryByText(/permanently delete the folder and all its contents/)).not.toBeInTheDocument();
    
    // Folder should show folder warning
    rerender(
      <DeleteConfirmDialog 
        {...defaultProps} 
        fileName="my-folder" 
        fileType="folder" 
      />
    );
    
    expect(screen.getByText(/permanently delete the folder and all its contents/)).toBeInTheDocument();
  });
});