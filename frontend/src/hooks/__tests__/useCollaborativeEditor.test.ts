import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock the socket hook first
const mockSocketHook = {
  broadcastFileChange: vi.fn(),
  broadcastCursorPosition: vi.fn(),
  broadcastUserActivity: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  isConnected: true
}

vi.mock('../useSocket', () => ({
  useSocket: vi.fn(() => mockSocketHook)
}))

// Mock Monaco Editor completely
vi.mock('monaco-editor', () => ({
  editor: {
    TrackedRangeStickiness: {
      NeverGrowsWhenTypingAtEdges: 0
    }
  }
}))

// Now import after mocking
import { useCollaborativeEditor } from '../useCollaborativeEditor'

// Mock Monaco Editor interface
const mockEditor = {
  getValue: vi.fn(() => 'test content'),
  setValue: vi.fn(),
  getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
  setPosition: vi.fn(),
  getSelection: vi.fn(() => ({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1
  })),
  onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeCursorSelection: vi.fn(() => ({ dispose: vi.fn() })),
  onDidFocusEditorText: vi.fn(() => ({ dispose: vi.fn() })),
  onDidBlurEditorText: vi.fn(() => ({ dispose: vi.fn() })),
  deltaDecorations: vi.fn()
}

describe('useCollaborativeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const defaultProps = {
    filePath: '/test/file.ts',
    initialContent: 'initial content',
    user: { id: 'user1', username: 'testuser' },
    debounceMs: 100
  }

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCollaborativeEditor(defaultProps))

    expect(result.current.cursors).toEqual([])
    expect(result.current.isReceivingRemoteChange).toBe(false)
    expect(result.current.documentVersion).toBe(0)
    expect(result.current.connectedUsers).toBe(0)
  })

  it('should set up socket event listeners', () => {
    renderHook(() => useCollaborativeEditor(defaultProps))

    expect(mockSocketHook.on).toHaveBeenCalledWith('file-updated', expect.any(Function))
    expect(mockSocketHook.on).toHaveBeenCalledWith('cursor-update', expect.any(Function))
    expect(mockSocketHook.on).toHaveBeenCalledWith('user-activity-update', expect.any(Function))
    expect(mockSocketHook.on).toHaveBeenCalledWith('user-left', expect.any(Function))
  })

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useCollaborativeEditor(defaultProps))

    unmount()

    expect(mockSocketHook.off).toHaveBeenCalledWith('file-updated')
    expect(mockSocketHook.off).toHaveBeenCalledWith('cursor-update')
    expect(mockSocketHook.off).toHaveBeenCalledWith('user-activity-update')
    expect(mockSocketHook.off).toHaveBeenCalledWith('user-left')
  })

  it('should initialize editor with event handlers', () => {
    const { result } = renderHook(() => useCollaborativeEditor(defaultProps))

    const cleanup = result.current.initializeEditor(mockEditor as any)

    expect(mockEditor.onDidChangeModelContent).toHaveBeenCalled()
    expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled()
    expect(mockEditor.onDidChangeCursorSelection).toHaveBeenCalled()
    expect(mockEditor.onDidFocusEditorText).toHaveBeenCalled()
    expect(mockEditor.onDidBlurEditorText).toHaveBeenCalled()

    // Cleanup should return a function
    expect(typeof cleanup).toBe('function')
  })

  it('should handle remote cursor updates', () => {
    const { result } = renderHook(() => useCollaborativeEditor(defaultProps))

    // Get the cursor-update handler
    const cursorUpdateHandler = mockSocketHook.on.mock.calls.find(
      call => call[0] === 'cursor-update'
    )?.[1]

    expect(cursorUpdateHandler).toBeDefined()

    // Simulate remote cursor update
    act(() => {
      cursorUpdateHandler({
        filePath: '/test/file.ts',
        user: { id: 'user2', username: 'otheruser' },
        position: { line: 5, column: 10 },
        timestamp: new Date()
      })
    })

    expect(result.current.cursors).toHaveLength(1)
    expect(result.current.cursors[0].userId).toBe('user2')
    expect(result.current.cursors[0].position).toEqual({ line: 5, column: 10 })
  })

  it('should ignore cursor updates from same user', () => {
    const { result } = renderHook(() => useCollaborativeEditor(defaultProps))

    const cursorUpdateHandler = mockSocketHook.on.mock.calls.find(
      call => call[0] === 'cursor-update'
    )?.[1]

    // Simulate own cursor update (should be ignored)
    act(() => {
      cursorUpdateHandler({
        filePath: '/test/file.ts',
        user: { id: 'user1', username: 'testuser' }, // Same as current user
        position: { line: 5, column: 10 },
        timestamp: new Date()
      })
    })

    expect(result.current.cursors).toHaveLength(0)
  })

  it('should handle user leaving', () => {
    const { result } = renderHook(() => useCollaborativeEditor(defaultProps))

    // First add a user
    const cursorUpdateHandler = mockSocketHook.on.mock.calls.find(
      call => call[0] === 'cursor-update'
    )?.[1]

    act(() => {
      cursorUpdateHandler({
        filePath: '/test/file.ts',
        user: { id: 'user2', username: 'otheruser' },
        position: { line: 5, column: 10 },
        timestamp: new Date()
      })
    })

    expect(result.current.cursors).toHaveLength(1)

    // Now simulate user leaving
    const userLeftHandler = mockSocketHook.on.mock.calls.find(
      call => call[0] === 'user-left'
    )?.[1]

    act(() => {
      userLeftHandler({
        user: { id: 'user2', username: 'otheruser' },
        timestamp: new Date()
      })
    })

    expect(result.current.cursors).toHaveLength(0)
  })

  it('should assign different colors to different users', () => {
    const { result } = renderHook(() => useCollaborativeEditor(defaultProps))

    const cursorUpdateHandler = mockSocketHook.on.mock.calls.find(
      call => call[0] === 'cursor-update'
    )?.[1]

    // Add multiple users
    act(() => {
      cursorUpdateHandler({
        filePath: '/test/file.ts',
        user: { id: 'user2', username: 'user2' },
        position: { line: 1, column: 1 },
        timestamp: new Date()
      })
    })

    act(() => {
      cursorUpdateHandler({
        filePath: '/test/file.ts',
        user: { id: 'user3', username: 'user3' },
        position: { line: 2, column: 1 },
        timestamp: new Date()
      })
    })

    expect(result.current.cursors).toHaveLength(2)
    expect(result.current.cursors[0].color).not.toBe(result.current.cursors[1].color)
  })
})