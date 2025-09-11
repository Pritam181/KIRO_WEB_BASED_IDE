import React, { useRef, useEffect, useCallback, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useCodeEditor, UseCodeEditorOptions } from '../hooks/useCodeEditor';

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
  checksum: string;
}

interface MonacoEditorProps extends UseCodeEditorOptions {
  file: FileContent | null;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
  readOnly?: boolean;
  height?: string | number;
  width?: string | number;
  className?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  file,
  theme = 'vs-dark',
  readOnly = false,
  height = '100%',
  width = '100%',
  className = '',
  ...editorOptions
}) => {
  const monacoRef = useRef<Monaco | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const {
    editorState,
    isSaving,
    handleContentChange,
    saveFile,
    setEditorRef,
    editorCommands,
  } = useCodeEditor({
    ...editorOptions,
    onSave: async (content: string) => {
      if (editorOptions.onSave) {
        await editorOptions.onSave(content);
      }
    },
  });

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setEditorRef(editor);
      monacoRef.current = monaco;
      setIsEditorReady(true);

      // Configure editor options
      editor.updateOptions({
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
        },
      });

      // Add custom keyboard shortcuts
      const addKeybinding = (
        keybinding: number,
        command: string,
        handler?: () => void
      ) => {
        editor.addCommand(keybinding, handler || (() => {
          editor.trigger('keyboard', command, {});
        }));
      };

      // Save shortcut
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        'editor.action.save',
        () => {
          saveFile().catch(console.error);
        }
      );

      // Undo/Redo shortcuts (Monaco handles these by default, but we can customize)
      addKeybinding(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, 'undo');
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
        'redo'
      );
      addKeybinding(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, 'redo');

      // Additional useful shortcuts
      addKeybinding(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, 'actions.find');
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
        'editor.action.startFindReplaceAction'
      );
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
        'editor.action.gotoLine'
      );
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
        'editor.action.addSelectionToNextFindMatch'
      );
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL,
        'editor.action.selectHighlights'
      );
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
        'editor.action.commentLine'
      );
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK,
        'editor.action.deleteLines'
      );
      addKeybinding(
        monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.DownArrow,
        'editor.action.copyLinesDownAction'
      );
      addKeybinding(
        monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.UpArrow,
        'editor.action.copyLinesUpAction'
      );

      // Format document
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
        'editor.action.formatDocument'
      );

      // Command palette
      addKeybinding(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
        'editor.action.quickCommand'
      );

      // Focus the editor
      editor.focus();
    },
    [setEditorRef, saveFile]
  );

  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: true,
      skipLibCheck: true,
    });

    // Configure JavaScript defaults
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
    });

    // Enable diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });

    // Configure JSON schema validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: true,
    });

    // Add custom themes if needed
    monaco.editor.defineTheme('kiro-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2D2D30',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
      },
    });
  }, []);

  // Get language from file extension or explicit language
  const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      ps1: 'powershell',
      dockerfile: 'dockerfile',
      r: 'r',
      matlab: 'matlab',
      lua: 'lua',
      perl: 'perl',
      vim: 'vim',
      toml: 'toml',
      ini: 'ini',
      conf: 'ini',
      gitignore: 'ignore',
      env: 'shell',
    };

    return languageMap[extension || ''] || 'plaintext';
  };

  if (!file) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 text-gray-400 ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Select a file from the explorer to start editing</p>
        </div>
      </div>
    );
  }

  const currentLanguage = file.language || getLanguageFromPath(file.path);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Status bar */}
      <div className="absolute top-0 right-0 z-10 bg-gray-800 text-gray-300 px-3 py-1 text-xs rounded-bl-md">
        <div className="flex items-center space-x-3">
          {isSaving && (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          )}
          {editorState.isDirty && !isSaving && (
            <span className="text-yellow-400">●</span>
          )}
          <span>{currentLanguage}</span>
          {editorState.cursorPosition && (
            <span>
              Ln {editorState.cursorPosition.lineNumber}, Col {editorState.cursorPosition.column}
            </span>
          )}
        </div>
      </div>

      <Editor
        height={height}
        width={width}
        language={currentLanguage}
        value={file.content}
        theme={theme === 'vs-dark' ? 'kiro-dark' : theme}
        onChange={handleContentChange}
        onMount={handleEditorDidMount}
        beforeMount={handleEditorWillMount}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: 'Fira Code, SF Mono, Monaco, Inconsolata, Roboto Mono, Consolas, monospace',
          fontLigatures: true,
          lineHeight: 1.6,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          trimAutoWhitespace: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoSurround: 'languageDefined',
          matchBrackets: 'always',
          showFoldingControls: 'always',
          foldingStrategy: 'indentation',
          smoothScrolling: true,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: 'on',
          multiCursorModifier: 'ctrlCmd',
          selectionHighlight: true,
          occurrencesHighlight: 'singleFile',
          codeLens: true,
          colorDecorators: true,
          lightbulb: {
            enabled: 'on',
          },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          acceptSuggestionOnCommitCharacter: true,
          snippetSuggestions: 'top',
          emptySelectionClipboard: false,
          copyWithSyntaxHighlighting: true,
          useTabStops: true,
          wordBasedSuggestions: 'matchingDocuments',
          renderLineHighlight: 'all',
          renderControlCharacters: false,
          renderIndentGuides: true,
          highlightActiveIndentGuide: true,
          rulers: [],
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            verticalScrollbarSize: 14,
            horizontalScrollbarSize: 14,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-gray-400 flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading editor...
            </div>
          </div>
        }
      />
    </div>
  );
};

export default MonacoEditor;