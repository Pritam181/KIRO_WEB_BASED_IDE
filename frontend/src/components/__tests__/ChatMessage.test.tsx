import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatMessage } from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types/chat';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ChatMessage', () => {
  const mockUserMessage: ChatMessageType = {
    id: '1',
    type: 'user',
    content: 'Hello, can you help me with this code?',
    timestamp: new Date('2023-01-01T17:30:00Z'), // 5:30 PM UTC
  };

  const mockAIMessage: ChatMessageType = {
    id: '2',
    type: 'ai',
    content: 'Sure! Here is some code:\n\n```javascript\nconsole.log("Hello World");\n```',
    timestamp: new Date('2023-01-01T12:01:00Z'),
  };

  it('renders user message correctly', () => {
    render(<ChatMessage message={mockUserMessage} />);
    
    expect(screen.getByText('Hello, can you help me with this code?')).toBeInTheDocument();
    // Check for timestamp (format may vary by locale)
    expect(screen.getByText(/\d{1,2}:\d{2}\s?(AM|PM)/)).toBeInTheDocument();
  });

  it('renders AI message correctly', () => {
    render(<ChatMessage message={mockAIMessage} />);
    
    expect(screen.getByText('Sure! Here is some code:')).toBeInTheDocument();
    // Check for code content (syntax highlighting may break up the text)
    expect(screen.getByText(/console/)).toBeInTheDocument();
    expect(screen.getByText(/Hello World/)).toBeInTheDocument();
  });

  it('displays different styling for user vs AI messages', () => {
    const { rerender } = render(<ChatMessage message={mockUserMessage} />);
    
    // User message should be right-aligned
    expect(screen.getByText('Hello, can you help me with this code?').closest('.rounded-lg')).toHaveClass('bg-blue-500');
    
    rerender(<ChatMessage message={mockAIMessage} />);
    
    // AI message should be left-aligned
    expect(screen.getByText('Sure! Here is some code:').closest('.rounded-lg')).toHaveClass('bg-gray-100');
  });

  it('shows feedback buttons for AI messages', () => {
    render(<ChatMessage message={mockAIMessage} />);
    
    expect(screen.getByTitle('Helpful')).toBeInTheDocument();
    expect(screen.getByTitle('Not helpful')).toBeInTheDocument();
  });

  it('does not show feedback buttons for user messages', () => {
    render(<ChatMessage message={mockUserMessage} />);
    
    expect(screen.queryByTitle('Helpful')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Not helpful')).not.toBeInTheDocument();
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    
    render(<ChatMessage message={mockAIMessage} />);
    
    const copyButton = screen.getByTitle('Copy code');
    fireEvent.click(copyButton);
    
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('console.log("Hello World");'));
  });

  it('displays context information when available', () => {
    const messageWithContext: ChatMessageType = {
      ...mockUserMessage,
      context: {
        files: ['file1.js', 'file2.ts'],
        selectedText: 'some selected text',
      },
    };

    render(<ChatMessage message={messageWithContext} />);
    
    expect(screen.getByText('Context: 2 file(s)')).toBeInTheDocument();
  });
});