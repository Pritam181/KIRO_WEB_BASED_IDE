import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = false,
  className = '',
}) => {
  // Use system theme preference
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const style = isDark ? vscDarkPlus : vs;

  // Map common language aliases
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    sh: 'bash',
    yml: 'yaml',
  };

  const normalizedLanguage = languageMap[language.toLowerCase()] || language.toLowerCase();

  return (
    <div className={`group relative ${className}`}>
      <SyntaxHighlighter
        language={normalizedLanguage}
        style={style}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          background: isDark ? '#1e1e1e' : '#f8f8f8',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};