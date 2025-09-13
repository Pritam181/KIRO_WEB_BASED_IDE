import { useEffect, useRef, useState, useCallback } from 'react'
import { socketService, type User, type ConnectedUser, type SocketEventHandlers } from '../services/socketService'

interface UseSocketOptions {
  serverUrl?: string
  autoConnect?: boolean
}

interface SocketState {
  isConnected: boolean
  isAuthenticated: boolean
  connectedUsers: ConnectedUser[]
  currentProject: string | null
  connectionError: string | null
  reconnectAttempts: number
}

export function useSocket(options: UseSocketOptions = {}) {
  const { 
    serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001',
    autoConnect = true 
  } = options

  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isAuthenticated: false,
    connectedUsers: [],
    currentProject: null,
    connectionError: null,
    reconnectAttempts: 0
  })

  const eventHandlersRef = useRef<Partial<SocketEventHandlers>>({})

  // Initialize socket connection
  useEffect(() => {
    if (autoConnect) {
      socketService.initialize(serverUrl)
    }

    return () => {
      socketService.destroy()
    }
  }, [serverUrl, autoConnect])

  // Set up event handlers
  useEffect(() => {
    const handlers: Partial<SocketEventHandlers> = {
      connect: () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionError: null,
          reconnectAttempts: 0
        }))
      },

      disconnect: (reason) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false,
          connectionError: reason
        }))
      },

      authenticated: (data) => {
        setState(prev => ({
          ...prev,
          isAuthenticated: data.success
        }))
      },

      'room-users': (users) => {
        setState(prev => ({
          ...prev,
          connectedUsers: users
        }))
      },

      'user-joined': (event) => {
        setState(prev => ({
          ...prev,
          connectedUsers: [...prev.connectedUsers, {
            ...event.user,
            lastSeen: event.timestamp
          }]
        }))
      },

      'user-left': (event) => {
        setState(prev => ({
          ...prev,
          connectedUsers: prev.connectedUsers.filter(user => user.id !== event.user.id)
        }))
      },

      error: (error) => {
        setState(prev => ({
          ...prev,
          connectionError: error.message
        }))
      },

      reconnect: (attemptNumber) => {
        setState(prev => ({
          ...prev,
          reconnectAttempts: attemptNumber,
          connectionError: null
        }))
      },

      reconnect_error: () => {
        setState(prev => ({
          ...prev,
          reconnectAttempts: prev.reconnectAttempts + 1
        }))
      }
    }

    // Register handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socketService.on(event as keyof SocketEventHandlers, handler as any)
    })

    eventHandlersRef.current = handlers

    return () => {
      // Cleanup handlers
      Object.keys(handlers).forEach(event => {
        socketService.off(event as keyof SocketEventHandlers)
      })
    }
  }, [])

  // Authentication
  const authenticate = useCallback((user: User) => {
    socketService.authenticate(user)
  }, [])

  // Project management
  const joinProject = useCallback((projectId: string) => {
    socketService.joinProject(projectId)
    setState(prev => ({
      ...prev,
      currentProject: projectId,
      connectedUsers: [] // Reset users list, will be updated by room-users event
    }))
  }, [])

  const leaveProject = useCallback(() => {
    socketService.leaveProject()
    setState(prev => ({
      ...prev,
      currentProject: null,
      connectedUsers: []
    }))
  }, [])

  // File collaboration
  const broadcastFileChange = useCallback((filePath: string, content: string) => {
    socketService.broadcastFileChange(filePath, content)
  }, [])

  const broadcastCursorPosition = useCallback((
    filePath: string,
    position: { line: number; column: number },
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
  ) => {
    socketService.broadcastCursorPosition(filePath, position, selection)
  }, [])

  const broadcastUserActivity = useCallback((activity: 'typing' | 'idle' | 'active', filePath?: string) => {
    socketService.broadcastUserActivity(activity, filePath)
  }, [])

  // Connection management
  const connect = useCallback(() => {
    socketService.connect()
  }, [])

  const disconnect = useCallback(() => {
    socketService.disconnect()
  }, [])

  // Event subscription
  const on = useCallback(<K extends keyof SocketEventHandlers>(
    event: K,
    handler: SocketEventHandlers[K]
  ) => {
    socketService.on(event, handler)
  }, [])

  const off = useCallback(<K extends keyof SocketEventHandlers>(event: K) => {
    socketService.off(event)
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    authenticate,
    joinProject,
    leaveProject,
    broadcastFileChange,
    broadcastCursorPosition,
    broadcastUserActivity,
    connect,
    disconnect,
    
    // Event management
    on,
    off,
    
    // Utilities
    isUserOnline: (userId: string) => state.connectedUsers.some(user => user.id === userId),
    getUserCount: () => state.connectedUsers.length
  }
}