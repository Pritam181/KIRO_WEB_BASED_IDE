# Monaco Editor Integration

This directory contains the Monaco Editor integration for the Kiro web-based IDE.

## Components

### MonacoEditor
The main Monaco Editor component with full TypeScript support and advanced features.

**Features:**
- ✅ TypeScript support with full compiler options
- ✅ Syntax highlighting for 25+ programming languages
- ✅ Auto-indentation and bracket matching
- ✅ Keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, etc.)
- ✅ Auto-save functionality with debouncing
- ✅ Custom themes (including Kiro dark theme)
- ✅ Status bar with cursor position and language info
- ✅ Loading states and error handling
- ✅ Comprehensive language detection from file extensions

**Supported Languages:**
- JavaScript/TypeScript (with full IntelliSense)
- Python
- Java
- C/C++
- C#
- PHP
- Ruby
- Go
- Rust
- Swift
- Kotlin
- Scala
- HTML/CSS/SCSS/SASS/LESS
- JSON/XML/YAML
- Markdown
- SQL
- Shell/Bash/PowerShell
- And many more...

### CodeEditor
A simpler wrapper around Monaco Editor for basic use cases.

### EditorDemo
A comprehensive demo component showcasing all editor features with a file explorer.

## Hooks

### useCodeEditor
A custom hook that provides:
- ✅ Auto-save functionality with configurable debouncing
- ✅ Editor state management (dirty state, cursor position, etc.)
- ✅ Manual save operations
- ✅ Editor command shortcuts
- ✅ Error handling for save operations

## Keyboard Shortcuts

The editor supports all standard Monaco Editor shortcuts plus custom ones:

- **Ctrl+S** - Save file
- **Ctrl+Z** - Undo
- **Ctrl+Y / Ctrl+Shift+Z** - Redo
- **Ctrl+F** - Find
- **Ctrl+H** - Find and Replace
- **Ctrl+G** - Go to Line
- **Ctrl+D** - Add Selection to Next Find Match
- **Ctrl+/** - Comment/Uncomment Line
- **Ctrl+Shift+K** - Delete Line
- **Alt+Shift+↓/↑** - Copy Line Down/Up
- **Ctrl+Shift+I** - Format Document
- **Ctrl+Shift+P** - Command Palette

## Configuration

The Monaco Editor is configured with:
- TypeScript compiler options for modern JavaScript/TypeScript
- JSON schema validation
- Comprehensive language support
- Custom Kiro dark theme
- Optimized performance settings
- Accessibility features

## Testing

All components are thoroughly tested with:
- Unit tests for individual components
- Integration tests for editor functionality
- Mock implementations for testing environments
- Coverage for keyboard shortcuts and auto-save

## Usage

```tsx
import { MonacoEditor, useCodeEditor } from './components/editor';

const MyEditor = () => {
  const file = {
    path: 'example.ts',
    content: 'console.log("Hello, World!");',
    language: 'typescript',
    size: 100,
    lastModified: new Date(),
    checksum: 'abc123',
  };

  const handleSave = async (content: string) => {
    // Save logic here
    console.log('Saving:', content);
  };

  return (
    <MonacoEditor
      file={file}
      onSave={handleSave}
      autoSave={true}
      autoSaveDelay={2000}
      theme="vs-dark"
    />
  );
};
```

## Requirements Satisfied

This implementation satisfies all requirements from task 4.1:

- ✅ **Set up Monaco Editor component with TypeScript support** - Full TypeScript integration with compiler options
- ✅ **Configure syntax highlighting for multiple programming languages** - 25+ languages supported
- ✅ **Implement auto-indentation and bracket matching** - Built-in Monaco features enabled
- ✅ **Add keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)** - All shortcuts implemented plus many more

The implementation goes beyond the basic requirements by adding:
- Auto-save functionality
- Custom themes
- Status bar with editor information
- Comprehensive testing
- Error handling
- Performance optimizations
- Accessibility features