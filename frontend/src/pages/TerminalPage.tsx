import React, { useState } from 'react';
import { Terminal } from '../components/Terminal';
import { Plus, X } from 'lucide-react';

interface TerminalTab {
  id: string;
  name: string;
  isActive: boolean;
}

export const TerminalPage: React.FC = () => {
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal 1', isActive: true }
  ]);
  const [nextId, setNextId] = useState(2);

  const addTerminal = () => {
    const newTerminal: TerminalTab = {
      id: nextId.toString(),
      name: `Terminal ${nextId}`,
      isActive: false
    };
    
    setTerminals(prev => [
      ...prev.map(t => ({ ...t, isActive: false })),
      { ...newTerminal, isActive: true }
    ]);
    setNextId(prev => prev + 1);
  };

  const closeTerminal = (id: string) => {
    if (terminals.length === 1) return; // Keep at least one terminal
    
    setTerminals(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length > 0 && !filtered.some(t => t.isActive)) {
        filtered[0].isActive = true;
      }
      return filtered;
    });
  };

  const switchTerminal = (id: string) => {
    setTerminals(prev => prev.map(t => ({ ...t, isActive: t.id === id })));
  };

  const activeTerminal = terminals.find(t => t.isActive);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Terminal Tabs */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center overflow-x-auto">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              className={`flex items-center gap-2 px-4 py-2 border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                terminal.isActive
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => switchTerminal(terminal.id)}
            >
              <span className="text-sm font-medium">{terminal.name}</span>
              {terminals.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(terminal.id);
                  }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <button
          onClick={addTerminal}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="New Terminal"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-4">
        {activeTerminal && (
          <Terminal
            key={activeTerminal.id}
            className="h-full"
          />
        )}
      </div>

      {/* Terminal Info */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Active: {activeTerminal?.name}</span>
            <span>Terminals: {terminals.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Kiro Web IDE Terminal</span>
            <span>Press Ctrl+C to interrupt</span>
          </div>
        </div>
      </div>
    </div>
  );
};