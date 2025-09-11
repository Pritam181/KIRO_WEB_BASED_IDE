import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileExplorer } from '../components/FileExplorer';
import { CodeEditor } from '../components/CodeEditor';
import { FileHistoryPanel } from '../components/FileHistoryPanel';
import { ConflictResolutionDialog } from '../components/ConflictResolutionDialog';
import { Terminal } from '../components/Terminal';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useFileManagement } from '../contexts/FileManagementContext';
import { useDemoFileManagement } from '../contexts/DemoFileManagementContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertCircle, Play, Terminal as TerminalIcon, Github, X as CloseIcon } from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  const [showTerminal, setShowTerminal] = useState(true);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);
  const [executeCommand, setExecuteCommand] = useState<string>('');
  const [showExplorer, setShowExplorer] = useState(true);
  // Sidebar removed; flags no longer used
  const [terminalHeight, setTerminalHeight] = useState<number>(192);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentAreaRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSidebarRef = useRef(false);
  const isDraggingTerminalRef = useRef(false);
  // Removed sidebar drag refs
  const dragStartYRef = useRef<number>(0);
  const dragStartTerminalHeightRef = useRef<number>(0);
  const [aiOpen, setAiOpen] = useState(false);
  
  // Use appropriate context based on demo mode
  let context;
  try {
    if (isDemoMode) {
      context = useDemoFileManagement();
    } else {
      context = useFileManagement();
    }
  } catch (error) {
    // Fallback to the other context if one fails
    try {
      context = isDemoMode ? useFileManagement() : useDemoFileManagement();
    } catch (fallbackError) {
      // If both fail, create a minimal context
      context = {
        files: [],
        currentFile: null,
        isLoading: false,
        error: 'Context not available',
        hasUnsavedChanges: false,
        conflictData: null,
        showFileHistory: false,
        projectId: 'default',
        loadFile: async () => {},
        createFile: async () => {},
        deleteFile: async () => {},
        renameFile: async () => {},
        uploadFiles: async () => {},
        loadFileTree: async () => {},
        updateFileContent: () => {},
        saveFile: async () => {},
        resolveConflict: async () => {},
        toggleFileHistory: () => {},
        restoreFileVersion: () => {},
        clearError: () => {},
        setProjectId: () => {},
      };
    }
  }
  
  const {
    files,
    currentFile,
    isLoading,
    error,
    hasUnsavedChanges,
    conflictData,
    showFileHistory,
    projectId,
    loadFile,
    createFile,
    deleteFile,
    renameFile,
    uploadFiles,
    loadFileTree,
    updateFileContent,
    saveFile,
    resolveConflict,
    toggleFileHistory,
    restoreFileVersion,
    clearError,
  } = context;

  const handleFileSelect = async (file: any) => {
    if (file.type === 'file') {
      await loadFile(file.path);
    }
  };

  const handleSaveFile = async () => {
    if (currentFile && hasUnsavedChanges) {
      await saveFile(currentFile.path, currentFile.content);
    }
  };

  const handleRunFile = () => {
    if (!currentFile) return;

    // Show terminal if hidden
    if (!showTerminal) {
      setShowTerminal(true);
    }
    
    // Unminimize terminal if minimized
    if (isTerminalMinimized) {
      setIsTerminalMinimized(false);
    }

    // Determine the appropriate command based on file extension
    const getRunCommand = (filePath: string): string => {
      const extension = filePath.split('.').pop()?.toLowerCase();
      const fileName = filePath.split('/').pop() || filePath;
      
      switch (extension) {
        case 'js':
          return `node ${fileName}`;
        case 'py':
          return `python ${fileName}`;
        case 'java':
          return `java ${fileName}`;
        case 'c':
          return `gcc ${fileName} -o ${fileName.replace('.c', '')} && ./${fileName.replace('.c', '')}`;
        case 'cpp':
          return `g++ ${fileName} -o ${fileName.replace('.cpp', '')} && ./${fileName.replace('.cpp', '')}`;
        case 'go':
          return `go run ${fileName}`;
        case 'rs':
          return `rustc ${fileName} && ./${fileName.replace('.rs', '')}`;
        case 'html':
          return `echo "Opening ${fileName} in browser..." && open ${fileName}`;
        case 'json':
          return `cat ${fileName}`;
        default:
          // For package.json or projects, try npm start
          if (fileName === 'package.json') {
            return 'npm start';
          }
          return `echo "Don't know how to run ${fileName}. Supported: .js, .py, .java, .c, .cpp, .go, .rs"`;
      }
    };

    const command = getRunCommand(currentFile.path);
    setExecuteCommand(command);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      handleSaveFile();
    } else if (event.key === 'F5' || (event.ctrlKey && event.key === 'F5')) {
      event.preventDefault();
      handleRunFile();
    } else if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      setAiOpen(v => !v);
    }
  };

  // Global hotkey so toggle works regardless of focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
        e.preventDefault();
        setAiOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Nudge layout on drawer toggle so terminal/editor recalc
  useEffect(() => {
    // allow next frame, then dispatch resize to fit editors/terminal
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
    return () => window.clearTimeout(id);
  }, [aiOpen]);

  // Global mouse handlers for resizing (delta-based for stability)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingTerminalRef.current) {
        const deltaY = e.clientY - dragStartYRef.current;
        // Dragging down increases height
        let next = dragStartTerminalHeightRef.current + deltaY;
        const minTerminal = 120;
        const rootRect = layoutRef.current?.getBoundingClientRect();
        const headerRect = headerRef.current?.getBoundingClientRect();
        const total = (rootRect?.height || 0);
        const headerH = (headerRect?.height || 0);
        const minEditor = 160; // allow tighter editor if needed
        const maxTerminal = Math.max(minTerminal, total - headerH - minEditor);
        if (!Number.isFinite(next)) next = minTerminal;
        setTerminalHeight(Math.min(Math.max(next, minTerminal), maxTerminal));
        // Trigger xterm fit while dragging
        window.dispatchEvent(new Event('resize'));
      }
    };
    const handleMouseUp = () => {
      isDraggingSidebarRef.current = false;
      isDraggingTerminalRef.current = false;
      // Restore cursor and selection
      document.body.style.cursor = '';
      document.body.classList.remove('select-none');
      // Trigger xterm fit
      window.dispatchEvent(new Event('resize'));
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    // Focus root to catch keyboard shortcuts like Ctrl+Shift+Enter
    if (rootRef.current) {
      try { rootRef.current.focus(); } catch {}
    }
  }, []);

  // Listen for header toggle and Ctrl+B
  useEffect(() => {
    const onToggle = () => setShowExplorer(v => !v);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setShowExplorer(v => !v);
      }
    };
    window.addEventListener('toggle-explorer', onToggle as EventListener);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('toggle-explorer', onToggle as EventListener);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="h-full flex" onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* Persistent Explorer (left) */}
      {showExplorer && (
        <div className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700">
          <FileExplorer
            projectFiles={files}
            onFileSelect={handleFileSelect}
            onFileCreate={createFile}
            onFileDelete={deleteFile}
            onFileRename={renameFile}
            onFileUpload={uploadFiles}
            onRefresh={loadFileTree}
            selectedFile={currentFile ? { 
              id: currentFile.path, 
              name: currentFile.path.split('/').pop() || '', 
              path: currentFile.path, 
              type: 'file' as const 
            } : undefined}
            isLoading={isLoading}
            onHistoryClick={toggleFileHistory}
          />
        </div>
      )}

      {/* Main Editor Area */}
      <div ref={layoutRef} className="flex-1 flex flex-col">
        {/* Header */}
        <div ref={headerRef} className="border-b border-gray-200 dark:border-gray-700 p-3 shrink-0 sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentFile && (
                <>
                  <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {currentFile.path.split('/').pop()}
                  </h2>
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* AI toggle */}
              <button
                onClick={() => setAiOpen(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${
                  aiOpen
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100'
                }`}
                title="Toggle AI (Ctrl+Shift+Enter)"
              >
                AI
              </button>
              {/* GitHub Push */}
              <button
                onClick={() => { /* TODO: wire to backend push */ alert('Push to GitHub coming soon'); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md transition-colors duration-200"
                title="Push to GitHub"
              >
                <Github className="w-4 h-4" />
                Push
              </button>
              {currentFile && (
                <>
                  <button
                    onClick={handleRunFile}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200"
                    title="Run Code (F5)"
                  >
                    <Play className="w-4 h-4" />
                    Run
                  </button>
                </>
              )}
              
              {/* Terminal button - always available */}
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors duration-200 ${
                  showTerminal 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100'
                }`}
                title="Toggle Terminal"
              >
                <TerminalIcon className="w-4 h-4" />
                Terminal
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              <button
                onClick={clearError}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                ×
              </button>
            </div>
            
            {/* Show connection status if error mentions backend */}
            {error.includes('backend') || error.includes('connect') || error.includes('5001') && (
              <div className="mt-2">
                <ConnectionStatus />
              </div>
            )}
          </div>
        )}

        {/* Editor Content */}
        <div className={`flex-1 relative ${showTerminal ? 'flex flex-col' : ''}`}>
          <div ref={contentAreaRef} className={showTerminal ? 'flex-1 min-h-[200px] relative' : 'h-full relative'}>
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : currentFile ? (
              <CodeEditor
                file={currentFile}
                onChange={updateFileContent}
                onSave={handleSaveFile}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            ) : (
              <div className="min-h-[240px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📄</span>
                  </div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    No file selected
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Select a file from the explorer to start editing.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* AI Drawer (right) */}
          {aiOpen && (
            <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col z-[100]">
              <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Kiro AI</div>
                <button onClick={() => setAiOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-2" id="ai-messages" />
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={(e) => { e.preventDefault(); }} className="flex items-center gap-2">
                  <input className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 py-1" placeholder="Ask Kiro AI..." />
                  <button className="px-3 py-1 text-sm rounded bg-blue-600 text-white">Send</button>
                </form>
              </div>
            </div>
          )}

          {/* Terminal */}
          {showTerminal && !isTerminalMinimized && (
            <div style={{ height: `${terminalHeight}px` }} className="relative shrink-0 select-none mt-2">
              <div
                onMouseDown={(e) => { 
                  isDraggingTerminalRef.current = true; 
                  dragStartYRef.current = e.clientY; 
                  dragStartTerminalHeightRef.current = terminalHeight; 
                  document.body.style.cursor = 'row-resize';
                  document.body.classList.add('select-none');
                }}
                className="absolute top-0 left-0 right-0 h-3 cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/30 z-30"
                title="Drag to resize terminal"
              />
              <Terminal
                onClose={() => setShowTerminal(false)}
                onMinimize={() => setIsTerminalMinimized(!isTerminalMinimized)}
                isMinimized={isTerminalMinimized}
                executeCommand={executeCommand}
                onCommandExecuted={() => setExecuteCommand('')}
                currentFileContent={currentFile?.content}
                currentFileName={currentFile?.path}
                className="h-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* File History Panel */}
      {showFileHistory && currentFile && (
        <FileHistoryPanel
          projectId={projectId}
          filePath={currentFile.path}
          onRestoreVersion={restoreFileVersion}
          onClose={toggleFileHistory}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {conflictData && (
        <ConflictResolutionDialog
          fileName={conflictData.filePath.split('/').pop() || ''}
          localContent={conflictData.localContent}
          serverContent={conflictData.serverContent}
          onResolve={resolveConflict}
          onCancel={() => resolveConflict('local')}
        />
      )}
    </div>
  );
};