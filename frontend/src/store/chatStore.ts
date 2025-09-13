import { create } from 'zustand';
import { ChatMessage, ChatState, ProjectContext } from '../types/chat';

interface ChatStore extends ChatState {
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  setTyping: (typing: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  
  // Context
  projectContext: ProjectContext | null;
  setProjectContext: (context: ProjectContext | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  messages: [],
  isLoading: false,
  isTyping: false,
  error: null,
  projectContext: null,

  // Actions
  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),
  
  setTyping: (typing) => set({ isTyping: typing }),
  
  setError: (error) => set({ error }),
  
  clearMessages: () => set({ messages: [] }),
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  setProjectContext: (context) => set({ projectContext: context }),
}));