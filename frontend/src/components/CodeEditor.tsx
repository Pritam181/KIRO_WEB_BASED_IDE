import React, { useRef, useCallback, useState, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { FileContent } from '../services/fileService';
import { Save, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface CodeEditorProps {
  file: FileContent;
  onChange: (content: string) => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
  theme?: 'vs-dark' | 'vs-light';
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onChange,
  onSave,
  hasUnsavedChanges,
  theme = 'vs-dark',
  readOnly = false,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [content, setContent] = useState<string>(file.content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(file.lastModified);

  // Update content when file changes
  useEffect(() => {
    setContent(file.content);
    setLastSaveTime(file.lastModified);
    setSaveStatus('saved');
  }, [file.content, file.lastModified]);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

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
      });

      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });

      // Ctrl+Z and Ctrl+Y are handled by Monaco by default
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
        editor.trigger('keyboard', 'undo', {});
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
        editor.trigger('keyboard', 'redo', {});
      });

      // Focus the editor
      editor.focus();
    },
    [onSave]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setContent(value);
        onChange(value);
        setSaveStatus('unsaved');
      }
    },
    [onChange]
  );

  // Configure Monaco Editor before it mounts
  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    // Configure additional language support
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
    });

    // Configure JavaScript defaults
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
    });

    // Enable additional language features
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Configure JSON schema validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: true,
    });
  }, []);

  // Get language from file extension
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
    };

    return languageMap[extension || ''] || 'plaintext';
  };

  // Update save status based on unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      setSaveStatus('unsaved');
    } else {
      setSaveStatus('saved');
      setLastSaveTime(new Date());
    }
  }, [hasUnsavedChanges]);

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'saving':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'unsaved':
        return <div className="w-2 h-2 bg-orange-500 rounded-full" />;
      default:
        return null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saved':
        return lastSaveTime && lastSaveTime instanceof Date ? `Saved ${lastSaveTime.toLocaleTimeString()}` : 'Saved';
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Save failed';
      case 'unsaved':
        return 'Unsaved changes';
      default:
        return '';
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={file.language || getLanguageFromPath(file.path)}
          value={content}
          theme={theme}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: 'Fira Code, Monaco, Consolas, monospace',
            lineHeight: 1.5,
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
              enabled: true,
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
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="text-gray-400">Loading editor...</div>
            </div>
          }
        />

        {/* Inline indicator removed to avoid clipping; status shown in bottom bar */}
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Language: {file.language}</span>
            <span>Size: {(file.size / 1024).toFixed(1)} KB</span>
            <span>Lines: {content.split('\n').length}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Manual Save button removed; auto-save is enabled */}

            <div className="flex items-center gap-1">
              {getSaveStatusIcon()}
              <span>{getSaveStatusText()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CodeEditor };