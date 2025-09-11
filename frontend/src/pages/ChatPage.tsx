import React from 'react';
import { MessageSquare } from 'lucide-react';

export const ChatPage: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          AI Chat
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Chat with Kiro AI assistant for coding help and guidance.
        </p>
      </div>
    </div>
  );
};