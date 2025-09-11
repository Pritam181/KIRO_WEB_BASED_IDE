import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { X, Minimize2, RotateCcw, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  className?: string;
  executeCommand?: string; // Command to execute automatically
  onCommandExecuted?: () => void; // Callback when command is executed
  currentFileContent?: string; // Current file content for realistic execution
  currentFileName?: string; // Current file name
}

export const Terminal: React.FC<TerminalProps> = ({
  onClose,
  onMinimize,
  isMinimized = false,
  className = '',
  executeCommand,
  onCommandExecuted,
  currentFileContent,
  currentFileName,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('~/project');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || isMinimized) return;

    // Initialize xterm.js with Kiro IDE theme
    const terminal = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4,
      allowTransparency: false,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal
    terminal.open(terminalRef.current);
    
    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Fit terminal to container and focus for input
    fitAddon.fit();
    setTimeout(() => {
      try { terminal.focus(); } catch {}
    }, 0);

    // Welcome message - Kiro style
    terminal.writeln('\x1b[90mKiro Web Terminal v1.0.0\x1b[0m');
    terminal.writeln('');

    // Simulate prompt - Kiro style
    const writePrompt = () => {
      terminal.write(`\x1b[32m➜\x1b[0m \x1b[36m${currentDirectory.split('/').pop() || 'project'}\x1b[0m \x1b[90mgit:(\x1b[0m\x1b[91mmain\x1b[0m\x1b[90m)\x1b[0m \x1b[32m$\x1b[0m `);
    };

    writePrompt();

    let currentLine = '';

    // Handle input
    terminal.onData((data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        terminal.writeln('');
        
        if (currentLine.trim()) {
          handleCommand(currentLine.trim(), terminal);
        }
        
        currentLine = '';
        writePrompt();
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (code >= 32) { // Printable characters
        currentLine += data;
        terminal.write(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (!fitAddon || !terminalRef.current) return;
      try {
        fitAddon.fit();
      } catch {
        // xterm may throw if dimensions not ready; ignore
      }
    };

    window.addEventListener('resize', handleResize);
    setIsConnected(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      setIsConnected(false);
    };
  }, [isMinimized, currentDirectory]);

  // Handle executeCommand prop changes
  useEffect(() => {
    if (executeCommand && xtermRef.current && !isMinimized) {
      const terminal = xtermRef.current;
      
      // Clear current line and execute command
      terminal.write('\r\x1b[K'); // Clear line
      terminal.write(`\x1b[32m➜\x1b[0m \x1b[36m${currentDirectory.split('/').pop() || 'project'}\x1b[0m \x1b[90mgit:(\x1b[0m\x1b[91mmain\x1b[0m\x1b[90m)\x1b[0m \x1b[32m$\x1b[0m ${executeCommand}`);
      
      setTimeout(() => {
        terminal.writeln('');
        setIsRunning(true);
        
        // Simulate command execution time
        setTimeout(() => {
          handleCommand(executeCommand, terminal);
          setIsRunning(false);
          
          // Write new prompt
          terminal.write(`\x1b[32m➜\x1b[0m \x1b[36m${currentDirectory.split('/').pop() || 'project'}\x1b[0m \x1b[90mgit:(\x1b[0m\x1b[91mmain\x1b[0m\x1b[90m)\x1b[0m \x1b[32m$\x1b[0m `);
          
          onCommandExecuted?.();
        }, 800); // Simulate execution time
      }, 100);
    }
  }, [executeCommand, isMinimized, currentDirectory, onCommandExecuted]);

  // Execute JavaScript from the editor using a lightweight sandbox that captures console output
  const executeJavaScript = (code?: string): { stdout: string[]; stderr?: string } => {
    if (!code) {
      return { stdout: ['JavaScript file executed'] };
    }

    const logs: string[] = [];
    const fakeConsole = {
      log: (...args: unknown[]) => {
        try {
          logs.push(args.map(a => {
            if (typeof a === 'object') {
              try { return JSON.stringify(a); } catch { return String(a); }
            }
            return String(a);
          }).join(' '));
        } catch {
          logs.push('[unprintable]');
        }
      },
      error: (...args: unknown[]) => {
        try {
          logs.push(args.map(a => String(a)).join(' '));
        } catch {
          logs.push('[error]');
        }
      },
      warn: (...args: unknown[]) => {
        try { logs.push(args.map(a => String(a)).join(' ')); } catch { logs.push('[warn]'); }
      },
      info: (...args: unknown[]) => {
        try { logs.push(args.map(a => String(a)).join(' ')); } catch { logs.push('[info]'); }
      }
    } as Console;

    try {
      // Disallow access to window/document by shadowing; code can still throw if it tries.
      const wrapped = `"use strict"; const window = undefined; const document = undefined; const global = undefined; const process = undefined; ${code}`;
      // Execute synchronously
      // eslint-disable-next-line no-new-func
      const fn = new Function('console', wrapped);
      fn(fakeConsole);
      if (logs.length === 0) {
        logs.push('Script executed successfully');
        logs.push('No console output detected');
      }
      return { stdout: logs };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.stack || err.message : String(err);
      return { stdout: logs, stderr: message };
    }
  };

  const handleCommand = (command: string, terminal: XTerm) => {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'help':
        terminal.writeln('\x1b[1;33mAvailable commands:\x1b[0m');
        terminal.writeln('  help          - Show this help message');
        terminal.writeln('  clear         - Clear the terminal');
        terminal.writeln('  ls            - List files and directories');
        terminal.writeln('  pwd           - Print working directory');
        terminal.writeln('  cd <dir>      - Change directory');
        terminal.writeln('  cat <file>    - Display file contents');
        terminal.writeln('  echo <text>   - Display text');
        terminal.writeln('  date          - Show current date and time');
        terminal.writeln('  whoami        - Show current user');
        terminal.writeln('  node <file>   - Run JavaScript file');
        terminal.writeln('  npm <command> - Run npm command');
        break;

      case 'clear':
        terminal.clear();
        break;

      case 'ls':
        terminal.writeln('\x1b[1;34msrc/\x1b[0m');
        terminal.writeln('\x1b[1;34mnode_modules/\x1b[0m');
        terminal.writeln('package.json');
        terminal.writeln('README.md');
        terminal.writeln('index.js');
        break;

      case 'pwd':
        terminal.writeln(currentDirectory);
        break;

      case 'cd':
        if (args[1]) {
          if (args[1] === '..') {
            const parts = currentDirectory.split('/');
            if (parts.length > 1) {
              parts.pop();
              setCurrentDirectory(parts.join('/') || '~');
            }
          } else if (args[1] === '~' || args[1] === '/') {
            setCurrentDirectory('~/project');
          } else {
            setCurrentDirectory(`${currentDirectory}/${args[1]}`);
          }
        } else {
          setCurrentDirectory('~/project');
        }
        break;

      case 'cat':
        if (args[1]) {
          terminal.writeln(`\x1b[1;33mDisplaying contents of ${args[1]}:\x1b[0m`);
          
          // Show actual file content if available and matches
          if (currentFileContent && currentFileName && args[1].includes(currentFileName.split('/').pop() || '')) {
            const lines = currentFileContent.split('\n').slice(0, 20); // Show first 20 lines
            lines.forEach(line => {
              terminal.writeln(line);
            });
            if (currentFileContent.split('\n').length > 20) {
              terminal.writeln('\x1b[90m... (truncated)\x1b[0m');
            }
          } else {
            terminal.writeln('// File content not available in current session');
            terminal.writeln('// Open the file in the editor first');
          }
        } else {
          terminal.writeln('\x1b[1;31mUsage: cat <filename>\x1b[0m');
        }
        break;

      case 'echo':
        terminal.writeln(args.slice(1).join(' '));
        break;

      case 'date':
        terminal.writeln(new Date().toString());
        break;

      case 'whoami':
        terminal.writeln('kiro-user');
        break;

      case 'node':
        if (args[1]) {
          terminal.writeln(`\x1b[1;32mRunning ${args[1]}...\x1b[0m`);
          const result = executeJavaScript(currentFileContent && currentFileName && args[1].includes(currentFileName.split('/').pop() || '') ? currentFileContent : undefined);
          result.stdout.forEach(line => terminal.writeln(line));
          if (result.stderr) {
            terminal.writeln('');
            terminal.writeln(`\x1b[1;31m${result.stderr}\x1b[0m`);
          }
          terminal.writeln('');
          terminal.writeln(result.stderr ? '\x1b[1;31m✗ Process exited with error\x1b[0m' : '\x1b[1;32m✓ Process completed successfully\x1b[0m');
        } else {
          terminal.writeln('\x1b[1;31mUsage: node <filename>\x1b[0m');
        }
        break;

      case 'npm':
        if (args[1]) {
          terminal.writeln(`\x1b[1;32m> npm ${args.slice(1).join(' ')}\x1b[0m`);
          terminal.writeln('');
          
          if (args[1] === 'start') {
            terminal.writeln('> demo-project@1.0.0 start');
            terminal.writeln('> node src/index.js');
            terminal.writeln('');
            terminal.writeln('Hello, Kiro Web IDE!');
            terminal.writeln('Hello, Developer! Welcome to Kiro.');
            terminal.writeln('');
            terminal.writeln('\x1b[1;32m✓ Server started successfully\x1b[0m');
          } else if (args[1] === 'install') {
            terminal.writeln('npm WARN deprecated package@1.0.0');
            terminal.writeln('added 42 packages in 2.1s');
            terminal.writeln('\x1b[1;32m✓ Installation completed\x1b[0m');
          } else if (args[1] === 'test') {
            terminal.writeln('> demo-project@1.0.0 test');
            terminal.writeln('> jest');
            terminal.writeln('');
            terminal.writeln('\x1b[1;32m PASS \x1b[0m src/App.test.js');
            terminal.writeln('\x1b[1;32m✓ All tests passed\x1b[0m');
          } else {
            terminal.writeln('npm WARN This is a simulated terminal');
            terminal.writeln('\x1b[1;32mCommand completed.\x1b[0m');
          }
        } else {
          terminal.writeln('\x1b[1;31mUsage: npm <command>\x1b[0m');
        }
        break;

      case 'python':
      case 'python3':
        if (args[1]) {
          terminal.writeln(`\x1b[1;32mRunning ${args[1]}...\x1b[0m`);
          terminal.writeln('Hello from Python!');
          terminal.writeln('Python 3.9.0 (default, Oct  9 2020, 15:07:54)');
          terminal.writeln('\x1b[1;32m✓ Python script executed successfully\x1b[0m');
        } else {
          terminal.writeln('\x1b[1;31mUsage: python <filename>\x1b[0m');
        }
        break;

      case 'java':
        if (args[1]) {
          const className = args[1].replace('.java', '');
          terminal.writeln(`\x1b[1;32mCompiling ${args[1]}...\x1b[0m`);
          terminal.writeln(`\x1b[1;32mRunning ${className}...\x1b[0m`);
          terminal.writeln('Hello from Java!');
          terminal.writeln('\x1b[1;32m✓ Java program executed successfully\x1b[0m');
        } else {
          terminal.writeln('\x1b[1;31mUsage: java <filename>\x1b[0m');
        }
        break;

      case 'gcc':
        if (args[1]) {
          terminal.writeln(`\x1b[1;32mCompiling ${args[1]}...\x1b[0m`);
          terminal.writeln('\x1b[1;32mRunning executable...\x1b[0m');
          terminal.writeln('Hello from C!');
          terminal.writeln('\x1b[1;32m✓ C program executed successfully\x1b[0m');
        } else {
          terminal.writeln('\x1b[1;31mUsage: gcc <filename>\x1b[0m');
        }
        break;

      case 'go':
        if (args[0] === 'go' && args[1] === 'run' && args[2]) {
          terminal.writeln(`\x1b[1;32mRunning ${args[2]}...\x1b[0m`);
          terminal.writeln('Hello from Go!');
          terminal.writeln('\x1b[1;32m✓ Go program executed successfully\x1b[0m');
        } else {
          terminal.writeln('\x1b[1;31mUsage: go run <filename>\x1b[0m');
        }
        break;

      default:
        terminal.writeln(`\x1b[1;31mCommand not found: ${cmd}\x1b[0m`);
        terminal.writeln('Type "help" for available commands.');
        break;
    }
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  if (isMinimized) {
    return null;
  }

  return (
    <div className={`bg-[#1e1e1e] border-t border-gray-600 flex flex-col h-full ${className}`}>
      {/* Terminal Header - Kiro style */}
      <div className="bg-[#2d2d30] px-3 py-1 flex items-center justify-between border-b border-gray-600">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Terminal</span>
          {isConnected && (
            <div className="flex items-center gap-1 ml-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-xs text-gray-400">{isRunning ? 'running...' : 'bash'}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded text-xs"
            title="Clear terminal"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded text-xs"
              title="Minimize"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white hover:bg-red-600 rounded text-xs"
              title="Close terminal"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef} 
        className="flex-1 bg-[#1e1e1e] cursor-text"
        style={{ minHeight: '120px' }}
        onClick={() => { try { xtermRef.current?.focus(); } catch {} }}
      />
    </div>
  );
};