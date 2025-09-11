import React, { useState } from 'react';
import MonacoEditor, { FileContent } from './MonacoEditor';

const EditorDemo: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<FileContent>({
    path: 'example.ts',
    content: `// Welcome to Kiro Web Editor!
// This is a demonstration of the Monaco Editor integration

interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
    console.log(\`User \${user.name} added successfully!\`);
  }

  getUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}

// Example usage
const userService = new UserService();

userService.addUser({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
});

const user = userService.getUserById('1');
console.log('Found user:', user);

// Try these keyboard shortcuts:
// Ctrl+S - Save file
// Ctrl+Z - Undo
// Ctrl+Y - Redo
// Ctrl+F - Find
// Ctrl+H - Find and Replace
// Ctrl+/ - Comment/Uncomment line
// Ctrl+Shift+I - Format document
`,
    language: 'typescript',
    size: 1024,
    lastModified: new Date(),
    checksum: 'demo123',
  });

  const [savedContent, setSavedContent] = useState<string>('');
  const [saveCount, setSaveCount] = useState(0);

  const handleSave = async (content: string) => {
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 500));
    setSavedContent(content);
    setSaveCount(prev => prev + 1);
    console.log('File saved!', { content: content.substring(0, 100) + '...' });
  };

  const handleContentChange = (content: string) => {
    setCurrentFile(prev => ({
      ...prev,
      content,
      lastModified: new Date(),
    }));
  };

  const sampleFiles: FileContent[] = [
    {
      path: 'example.ts',
      content: currentFile.content,
      language: 'typescript',
      size: 1024,
      lastModified: new Date(),
      checksum: 'demo123',
    },
    {
      path: 'example.js',
      content: `// JavaScript Example
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log('Fibonacci sequence:');
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
      language: 'javascript',
      size: 512,
      lastModified: new Date(),
      checksum: 'js123',
    },
    {
      path: 'example.py',
      content: `# Python Example
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)

# Example usage
numbers = [64, 34, 25, 12, 22, 11, 90]
print("Original array:", numbers)
sorted_numbers = quicksort(numbers)
print("Sorted array:", sorted_numbers)`,
      language: 'python',
      size: 768,
      lastModified: new Date(),
      checksum: 'py123',
    },
    {
      path: 'example.json',
      content: `{
  "name": "kiro-web-editor",
  "version": "1.0.0",
  "description": "A web-based code editor with AI assistance",
  "features": [
    "Syntax highlighting",
    "Auto-completion",
    "Multiple language support",
    "Keyboard shortcuts",
    "Auto-save functionality"
  ],
  "languages": {
    "typescript": "✅",
    "javascript": "✅",
    "python": "✅",
    "java": "✅",
    "cpp": "✅",
    "html": "✅",
    "css": "✅",
    "json": "✅"
  }
}`,
      language: 'json',
      size: 256,
      lastModified: new Date(),
      checksum: 'json123',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-xl font-bold text-white mb-2">Monaco Editor Demo</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-300">
          <span>Save count: {saveCount}</span>
          <span>Current file: {currentFile.path}</span>
          <span>Language: {currentFile.language}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <h2 className="text-white font-semibold mb-3">Files</h2>
          <div className="space-y-1">
            {sampleFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => setCurrentFile(file)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentFile.path === file.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-2">
                    {file.language === 'typescript' && '📘'}
                    {file.language === 'javascript' && '📙'}
                    {file.language === 'python' && '🐍'}
                    {file.language === 'json' && '📋'}
                  </span>
                  {file.path}
                </div>
              </button>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-3 bg-gray-700 rounded text-xs text-gray-300">
            <h3 className="font-semibold mb-2">Keyboard Shortcuts:</h3>
            <ul className="space-y-1">
              <li><kbd className="bg-gray-600 px-1 rounded">Ctrl+S</kbd> Save</li>
              <li><kbd className="bg-gray-600 px-1 rounded">Ctrl+Z</kbd> Undo</li>
              <li><kbd className="bg-gray-600 px-1 rounded">Ctrl+Y</kbd> Redo</li>
              <li><kbd className="bg-gray-600 px-1 rounded">Ctrl+F</kbd> Find</li>
              <li><kbd className="bg-gray-600 px-1 rounded">Ctrl+/</kbd> Comment</li>
            </ul>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <MonacoEditor
            file={currentFile}
            onSave={handleSave}
            onContentChange={handleContentChange}
            autoSave={true}
            autoSaveDelay={2000}
            theme="vs-dark"
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <div>
            Monaco Editor integrated with TypeScript support, syntax highlighting, and keyboard shortcuts
          </div>
          <div>
            {savedContent && (
              <span className="text-green-400">
                ✓ Last saved: {new Date().toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorDemo;