import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIChat } from '../AIChat';
import { useChatStore } from '../../store/chatStore';

// Mock the chat store
vi.mock('../../store/chatStore');

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

describe('AIChat', () => {
  const mockAddMessage = vi.fn();
  const mockSetLoading = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChatStore as any).mockReturnValue({
      messages: [],
      isLoading: false,
      isTyping: false,
      error: null,
      addMessage: mockAddMessage,
      setLoading: mockSetLoading,
      setError: mockSetError,
      projectContext: null,
    });
  });

  it('renders welcome message when no messages', () => {
    render(<AIChat />);
    
    expect(screen.getByText('Welcome to Kiro AI')).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything about your code/)).toBeInTheDocument();
  });

  it('renders input field and send button', () => {
    render(<AIChat />);
    
    expect(screen.getByPlaceholderText(/Ask Kiro AI for help/)).toBeInTheDocument();
    expect(screen.getByTitle('Send message')).toBeInTheDocument();
  });

  it('sends message when send button is clicked', async () => {
    render(<AIChat />);
    
    const input = screen.getByPlaceholderText(/Ask Kiro AI for help/);
    const sendButton = screen.getByTitle('Send message');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        type: 'user',
        content: 'Test message',
        context: undefined,
      });
    });
  });

  it('sends message when Enter is pressed', async () => {
    render(<AIChat />);
    
    const input = screen.getByPlaceholderText(/Ask Kiro AI for help/);
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith({
        type: 'user',
        content: 'Test message',
        context: undefined,
      });
    });
  });

  it('does not send empty messages', () => {
    render(<AIChat />);
    
    const sendButton = screen.getByTitle('Send message');
    fireEvent.click(sendButton);
    
    expect(mockAddMessage).not.toHaveBeenCalled();
  });

  it('disables input when loading', () => {
    (useChatStore as any).mockReturnValue({
      messages: [],
      isLoading: true,
      isTyping: false,
      error: null,
      addMessage: mockAddMessage,
      setLoading: mockSetLoading,
      setError: mockSetError,
      projectContext: null,
    });

    render(<AIChat />);
    
    const input = screen.getByPlaceholderText(/Ask Kiro AI for help/);
    expect(input).toBeDisabled();
  });

  it('displays error message when error exists', () => {
    (useChatStore as any).mockReturnValue({
      messages: [],
      isLoading: false,
      isTyping: false,
      error: 'Test error message',
      addMessage: mockAddMessage,
      setLoading: mockSetLoading,
      setError: mockSetError,
      projectContext: null,
    });

    render(<AIChat />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });
});