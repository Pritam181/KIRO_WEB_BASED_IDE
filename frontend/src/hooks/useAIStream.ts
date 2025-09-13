import { useState, useCallback } from 'react';
import { aiService, ChatRequest, StreamChunk } from '../services/aiService';
import { useChatStore } from '../store/chatStore';

export const useAIStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const { addMessage, updateMessage, setTyping } = useChatStore();

  const streamMessage = useCallback(async (request: ChatRequest) => {
    if (isStreaming) return;

    setIsStreaming(true);
    setTyping(true);

    let currentMessageId: string | null = null;
    let accumulatedContent = '';

    try {
      for await (const chunk of aiService.streamMessage(request)) {
        switch (chunk.type) {
          case 'start':
            // Create initial AI message
            currentMessageId = chunk.id || crypto.randomUUID();
            addMessage({
              type: 'ai',
              content: '',
            });
            break;

          case 'chunk':
            if (chunk.content && currentMessageId) {
              accumulatedContent += chunk.content;
              // Update the message content
              updateMessage(currentMessageId, {
                content: accumulatedContent,
              });
            }
            break;

          case 'end':
            setTyping(false);
            break;

          case 'error':
            console.error('Stream error:', chunk.message);
            if (currentMessageId) {
              updateMessage(currentMessageId, {
                content: accumulatedContent || 'Sorry, I encountered an error processing your request.',
              });
            } else {
              addMessage({
                type: 'ai',
                content: 'Sorry, I encountered an error processing your request.',
              });
            }
            setTyping(false);
            break;
        }
      }
    } catch (error) {
      console.error('Streaming failed:', error);
      setTyping(false);
      
      if (currentMessageId) {
        updateMessage(currentMessageId, {
          content: accumulatedContent || 'Sorry, I encountered an error processing your request.',
        });
      } else {
        addMessage({
          type: 'ai',
          content: 'Sorry, I encountered an error processing your request.',
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, addMessage, updateMessage, setTyping]);

  return {
    streamMessage,
    isStreaming,
  };
};