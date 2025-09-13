import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSocket } from '../useSocket'
import { socketService } from '../../services/socketService'

// Mock the socket service
vi.mock('../../services/socketService', () => ({
  socketService: {
    initialize: vi.fn(),
    authenticate: vi.fn(),
    joinProject: vi.fn(),
    leaveProject: vi.fn(),
    broadcastFileChange: vi.fn(),
    broadcastCursorPosition: vi.fn(),
    broadcastUserActivity: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    get isConnected() { return true },
    get currentProject() { return 'test-project' },
    get user() { return { id: 'user1', username: 'testuser' } }
  }
}))

const mockSocketService = socketService as any

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize socket service on mount', () => {
    renderHook(() => useSocket())
    
    expect(mockSocketService.initialize).toHaveBeenCalledWith('http://localhost:3001')
  })

  it('should not auto-connect when autoConnect is false', () => {
    renderHook(() => useSocket({ autoConnect: false }))
    
    expect(mockSocketService.initialize).not.toHaveBeenCalled()
  })

  it('should use custom server URL', () => {
    const customUrl = 'http://localhost:4000'
    renderHook(() => useSocket({ serverUrl: customUrl }))
    
    expect(mockSocketService.initialize).toHaveBeenCalledWith(customUrl)
  })

  it('should authenticate user', () => {
    const { result } = renderHook(() => useSocket())
    const user = { id: 'user1', username: 'testuser' }

    act(() => {
      result.current.authenticate(user)
    })

    expect(mockSocketService.authenticate).toHaveBeenCalledWith(user)
  })

  it('should join project', () => {
    const { result } = renderHook(() => useSocket())
    const projectId = 'test-project'

    act(() => {
      result.current.joinProject(projectId)
    })

    expect(mockSocketService.joinProject).toHaveBeenCalledWith(projectId)
    expect(result.current.currentProject).toBe(projectId)
  })

  it('should leave project', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.leaveProject()
    })

    expect(mockSocketService.leaveProject).toHaveBeenCalled()
    expect(result.current.currentProject).toBe(null)
  })

  it('should broadcast file changes', () => {
    const { result } = renderHook(() => useSocket())
    const filePath = '/src/test.ts'
    const content = 'console.log("test")'

    act(() => {
      result.current.broadcastFileChange(filePath, content)
    })

    expect(mockSocketService.broadcastFileChange).toHaveBeenCalledWith(filePath, content)
  })

  it('should broadcast cursor position', () => {
    const { result } = renderHook(() => useSocket())
    const filePath = '/src/test.ts'
    const position = { line: 1, column: 5 }
    const selection = { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } }

    act(() => {
      result.current.broadcastCursorPosition(filePath, position, selection)
    })

    expect(mockSocketService.broadcastCursorPosition).toHaveBeenCalledWith(filePath, position, selection)
  })

  it('should broadcast user activity', () => {
    const { result } = renderHook(() => useSocket())
    const activity = 'typing'
    const filePath = '/src/test.ts'

    act(() => {
      result.current.broadcastUserActivity(activity, filePath)
    })

    expect(mockSocketService.broadcastUserActivity).toHaveBeenCalledWith(activity, filePath)
  })

  it('should manage event handlers', () => {
    const { result } = renderHook(() => useSocket())
    const handler = vi.fn()

    act(() => {
      result.current.on('connect', handler)
    })

    expect(mockSocketService.on).toHaveBeenCalledWith('connect', handler)

    act(() => {
      result.current.off('connect')
    })

    expect(mockSocketService.off).toHaveBeenCalledWith('connect')
  })

  it('should handle connection management', () => {
    const { result } = renderHook(() => useSocket())

    act(() => {
      result.current.connect()
    })

    expect(mockSocketService.connect).toHaveBeenCalled()

    act(() => {
      result.current.disconnect()
    })

    expect(mockSocketService.disconnect).toHaveBeenCalled()
  })

  it('should provide utility functions', () => {
    const { result } = renderHook(() => useSocket())

    // Mock some connected users
    act(() => {
      // Simulate users being added to state
      result.current.connectedUsers = [
        { id: 'user1', username: 'user1', lastSeen: new Date() },
        { id: 'user2', username: 'user2', lastSeen: new Date() }
      ]
    })

    expect(result.current.getUserCount()).toBe(0) // Initial state
    expect(typeof result.current.isUserOnline('user1')).toBe('boolean')
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSocket())

    unmount()

    expect(mockSocketService.destroy).toHaveBeenCalled()
  })
})