import { describe, it, expect, beforeEach } from '@jest/globals';
import { aiService, ChatRequest } from '../services/aiService';

describe('AIService', () => {
  let mockRequest: ChatRequest;

  beforeEach(() => {
    mockRequest = {
      message: 'Hello, can you help me with React?',
      context: {
        projectId: 'test-project',
        currentFile: 'src/App.tsx',
        openFiles: ['src/App.tsx', 'src/components/Header.tsx'],
      },
    };
  });

  describe('processMessage', () => {
    it('should process a message and return a response', async () => {
      const response = await aiService.processMessage(mockRequest);

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('timestamp');
      expect(response.content).toContain('React');
      expect(response.suggestions).toBeDefined();
    });

    it('should handle error-related messages', async () => {
      const errorRequest = {
        ...mockRequest,
        message: 'I have an error in my code',
      };

      const response = await aiService.processMessage(errorRequest);

      expect(response.content).toContain('debug');
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions!.length).toBeGreaterThan(0);
    });

    it('should handle API-related messages', async () => {
      const apiRequest = {
        ...mockRequest,
        message: 'How do I make an API call?',
      };

      const response = await aiService.processMessage(apiRequest);

      expect(response.content).toContain('API');
      expect(response.suggestions).toBeDefined();
      expect(response.suggestions![0].code).toContain('fetch');
    });

    it('should provide default response for general messages', async () => {
      const generalRequest = {
        ...mockRequest,
        message: 'What can you help me with?',
      };

      const response = await aiService.processMessage(generalRequest);

      expect(response.content).toContain('help');
      expect(response.content).toContain('test-project');
    });
  });

  describe('streamResponse', () => {
    it('should stream response chunks', async () => {
      const chunks: string[] = [];
      
      for await (const chunk of aiService.streamResponse(mockRequest)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('React');
    });
  });

  describe('gatherProjectContext', () => {
    it('should gather project context', async () => {
      const context = await aiService.gatherProjectContext('test-project', 'src/App.tsx');

      expect(context).toHaveProperty('projectId', 'test-project');
      expect(context).toHaveProperty('currentFile', 'src/App.tsx');
      expect(context).toHaveProperty('fileCount');
      expect(context).toHaveProperty('languages');
      expect(context.languages).toContain('typescript');
    });

    it('should work without current file', async () => {
      const context = await aiService.gatherProjectContext('test-project');

      expect(context).toHaveProperty('projectId', 'test-project');
      expect(context.currentFile).toBeUndefined();
    });
  });
});