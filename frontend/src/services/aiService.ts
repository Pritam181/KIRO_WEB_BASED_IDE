import axios from 'axios';
import { ChatMessage, ProjectContext, CodeSuggestion } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatRequest {
  message: string;
  context?: {
    projectId: string;
    currentFile?: string;
    selectedText?: string;
    openFiles: string[];
  };
}

export interface ChatResponse {
  id: string;
  content: string;
  timestamp: string;
  suggestions?: CodeSuggestion[];
}

export interface StreamChunk {
  type: 'start' | 'chunk' | 'end' | 'error';
  id?: string;
  content?: string;
  message?: string;
}

class AIService {
  private static instance: AIService;

  private constructor() {
    // Configure axios defaults
    axios.defaults.withCredentials = true;
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Send a message to the AI assistant
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/chat`, request);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'AI request failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('AI service error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(error.response?.data?.message || 'Failed to send message to AI');
      }
      
      throw new Error('Network error occurred');
    }
  }

  /**
   * Stream AI response for real-time interaction
   */
  async *streamMessage(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                yield data as StreamChunk;
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('AI stream error:', error);
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'Stream error occurred',
      };
    }
  }

  /**
   * Get project context for AI processing
   */
  async getProjectContext(projectId: string, currentFile?: string): Promise<any> {
    try {
      const params = currentFile ? { currentFile } : {};
      const response = await axios.get(`${API_BASE_URL}/api/ai/context/${projectId}`, { params });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get project context');
      }

      return response.data.data;
    } catch (error) {
      console.error('Project context error:', error);
      
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to get project context');
      }
      
      throw new Error('Network error occurred');
    }
  }

  /**
   * Submit feedback on AI responses
   */
  async submitFeedback(messageId: string, feedback: 'up' | 'down', comment?: string): Promise<void> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/feedback`, {
        messageId,
        feedback,
        comment,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to submit feedback');
      }
      
      throw new Error('Network error occurred');
    }
  }

  /**
   * Convert project context to chat request context
   */
  convertProjectContext(projectContext: ProjectContext | null): ChatRequest['context'] | undefined {
    if (!projectContext) return undefined;

    return {
      projectId: projectContext.projectId,
      currentFile: projectContext.currentFile,
      selectedText: projectContext.selectedText,
      openFiles: projectContext.openFiles,
    };
  }
}

export const aiService = AIService.getInstance();