import React, { useState } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ChatMessage as ChatMessageType, CodeSuggestion } from '../types/chat';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const isUser = message.type === 'user';
  
  // Parse code blocks from message content
  const parseCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[2],
        language: match[1] || 'text',
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content }];
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    setFeedback(type);
    
    try {
      const { aiService } = await import('../services/aiService');
      await aiService.submitFeedback(message.id, type);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Reset feedback state on error
      setFeedback(null);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const messageParts = parseCodeBlocks(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          }`}>
            <div className="space-y-2">
              {messageParts.map((part, index) => (
                <div key={index}>
                  {part.type === 'text' ? (
                    <div className="whitespace-pre-wrap">{part.content}</div>
                  ) : (
                    <div className="relative">
                      <CodeBlock
                        code={part.content}
                        language={part.language || 'text'}
                        showLineNumbers={part.content.split('\n').length > 3}
                      />
                      <button
                        onClick={() => handleCopyCode(part.content)}
                        className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy code"
                      >
                        {copiedCode === part.content ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message Footer */}
          <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400 ${
            isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
          }`}>
            <span>{formatTimestamp(message.timestamp)}</span>
            
            {/* Context Info */}
            {message.context && message.context.files.length > 0 && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Context: {message.context.files.length} file(s)
              </span>
            )}

            {/* AI Message Feedback */}
            {!isUser && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleFeedback('up')}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    feedback === 'up' ? 'text-green-500' : 'text-gray-400'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    feedback === 'down' ? 'text-red-500' : 'text-gray-400'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};