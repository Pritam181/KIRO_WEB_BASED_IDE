export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  context?: {
    files: string[];
    selectedText?: string;
  };
}

export interface ProjectContext {
  projectId: string;
  currentFile?: string;
  selectedText?: string;
  openFiles: string[];
}

export interface CodeSuggestion {
  id: string;
  messageId: string;
  code: string;
  language: string;
  startLine?: number;
  endLine?: number;
  filePath?: string;
  description?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
}