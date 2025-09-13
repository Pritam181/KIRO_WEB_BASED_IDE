import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, Copy, Check, MoreVertical, Zap } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { LoadingSpinner } from './LoadingSpinner';
import { aiService } from '../services/aiService';
import { useAIStream } from '../hooks/useAIStream';

interface AIChatProps {
  className?: string;
}

export const AIChat: React.FC<AIChatProps> = ({ className = '' }) => {
  const [inputValue, setInputValue] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    isLoading,
    isTyping,
    error,
    addMessage,
    setLoading,
    setError,
    clearMessages,
    projectContext,
  } = useChatStore();

  const { streamMessage, isStreaming } = useAIStream();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;

    const messageContent = inputValue.trim();
    setInputValue('');

    // Add user message
    addMessage({
      type: 'user',
      content: messageContent,
      context: projectContext ? {
        files: projectContext.openFiles,
        selectedText: projectContext.selectedText,
      } : undefined,
    });

    setError(null);

    // Prepare AI request
    const aiRequest = {
      message: messageContent,
      context: aiService.convertProjectContext(projectContext),
    };

    if (useStreaming) {
      // Use streaming response
      try {
        await streamMessage(aiRequest);
      } catch (error) {
        console.error('AI streaming failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to get AI response');
      }
    } else {
      // Use regular response
      setLoading(true);
      try {
        const response = await aiService.sendMessage(aiRequest);
        addMessage({
          type: 'ai',
          content: response.content,
        });
      } catch (error) {
        console.error('AI request failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to get AI response');
        
        addMessage({
          type: 'ai',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContextMenu = () => {
    setShowContextMenu(!showContextMenu);
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Kiro AI Assistant
          </h2>
        </div>
        <div className="relative">
          <button
            onClick={handleContextMenu}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          {showContextMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <button
                onClick={() => {
                  setUseStreaming(!useStreaming);
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                {useStreaming ? 'Disable' : 'Enable'} Streaming
              </button>
              <button
                onClick={() => {
                  clearMessages();
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Clear Chat
              </button>
              <button
                onClick={() => {
                  // TODO: Implement export chat functionality
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Export Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Welcome to Kiro AI
            </h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-md">
              Ask me anything about your code, get help with debugging, or request code suggestions.
              I can see your current project context to provide better assistance.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Kiro AI for help with your code..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            {projectContext && (
              <div className="absolute -top-8 left-0 text-xs text-gray-500 dark:text-gray-400">
                Context: {projectContext.currentFile || 'No file selected'}
              </div>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isStreaming}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            {isLoading || isStreaming ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};