import { io, Socket } from 'socket.io-client'

export interface User {
  id: string
  username: string
  avatarUrl?: string
}

export interface ConnectedUser extends User {
  lastSeen: Date
}

export interface FileChangeEvent {
  filePath: string
  content: string
  updatedBy: User
  timestamp: Date
}

export interface CursorUpdateEvent {
  filePath: string
  user: User
  position: { line: number; column: number }
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
  timestamp: Date
}

export interface UserActivityEvent {
  user: User
  activity: 'typing' | 'idle' | 'active'
  filePath?: string
  timestamp: Date
}

export interface UserJoinedEvent {
  user: User
  timestamp: Date
}

export interface UserLeftEvent {
  user: User
  timestamp: Date
}

export type SocketEventHandlers = {
  'authenticated': (data: { success: boolean; user: User }) => void
  'room-users': (users: ConnectedUser[]) => void
  'user-joined': (event: UserJoinedEvent) => void
  'user-left': (event: UserLeftEvent) => void
  'file-updated': (event: FileChangeEvent) => void
  'cursor-update': (event: CursorUpdateEvent) => void
  'user-activity-update': (event: UserActivityEvent) => void
  'error': (error: { message: string }) => void
  'connect': () => void
  'disconnect': (reason: string) => void
  'reconnect': (attemptNumber: number) => void
  'reconnect_error': (error: Error) => void
}

class SocketService {
  private socket: Socket | null = null
  private currentUser: User | null = null
  private currentProjectId: string | null = null
  private eventHandlers: Partial<SocketEventHandlers> = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  initialize(serverUrl: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: this.maxReconnectAttempts
    })

    this.setupEventListeners()
    console.log('🔌 Socket.io client initialized')
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server')
      this.reconnectAttempts = 0
      this.eventHandlers.connect?.()

      // Re-authenticate if we have user data
      if (this.currentUser) {
        this.authenticate(this.currentUser)
      }

      // Re-join project if we were in one
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from server: ${reason}`)
      this.eventHandlers.disconnect?.(reason)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
      this.eventHandlers.reconnect?.(attemptNumber)
    })

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++
      console.error(`❌ Reconnection failed (attempt ${this.reconnectAttempts}):`, error)
      this.eventHandlers.reconnect_error?.(error)
    })

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('✅ Authenticated with server')
      this.eventHandlers.authenticated?.(data)
    })

    // Room events
    this.socket.on('room-users', (users) => {
      this.eventHandlers['room-users']?.(users)
    })

    this.socket.on('user-joined', (event) => {
      console.log(`👤 User joined: ${event.user.username}`)
      this.eventHandlers['user-joined']?.(event)
    })

    this.socket.on('user-left', (event) => {
      console.log(`👋 User left: ${event.user.username}`)
      this.eventHandlers['user-left']?.(event)
    })

    // File collaboration events
    this.socket.on('file-updated', (event) => {
      console.log(`📝 File updated: ${event.filePath} by ${event.updatedBy.username}`)
      this.eventHandlers['file-updated']?.(event)
    })

    this.socket.on('cursor-update', (event) => {
      this.eventHandlers['cursor-update']?.(event)
    })

    this.socket.on('user-activity-update', (event) => {
      this.eventHandlers['user-activity-update']?.(event)
    })

    // Error events
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error)
      this.eventHandlers.error?.(error)
    })
  }

  // Authentication
  authenticate(user: User): void {
    if (!this.socket?.connected) {
      console.warn('Cannot authenticate: socket not connected')
      return
    }

    this.currentUser = user
    this.socket.emit('authenticate', user)
  }

  // Project room management
  joinProject(projectId: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot join project: socket not connected')
      return
    }

    this.currentProjectId = projectId
    this.socket.emit('join-project', projectId)
    console.log(`🏠 Joining project: ${projectId}`)
  }

  leaveProject(): void {
    if (!this.socket?.connected) return

    this.socket.emit('leave-project')
    this.currentProjectId = null
    console.log('🚪 Left project')
  }

  // File collaboration
  broadcastFileChange(filePath: string, content: string): void {
    if (!this.socket?.connected || !this.currentProjectId || !this.currentUser) return

    this.socket.emit('file-change', {
      projectId: this.currentProjectId,
      filePath,
      content,
      userId: this.currentUser.id,
      timestamp: new Date()
    })
  }

  broadcastCursorPosition(
    filePath: string, 
    position: { line: number; column: number },
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
  ): void {
    if (!this.socket?.connected || !this.currentProjectId) return

    this.socket.emit('cursor-position', {
      projectId: this.currentProjectId,
      filePath,
      position,
      selection
    })
  }

  broadcastUserActivity(activity: 'typing' | 'idle' | 'active', filePath?: string): void {
    if (!this.socket?.connected || !this.currentProjectId) return

    this.socket.emit('user-activity', {
      type: activity,
      filePath
    })
  }

  // Event handler management
  on<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    this.eventHandlers[event] = handler
  }

  off<K extends keyof SocketEventHandlers>(event: K): void {
    delete this.eventHandlers[event]
  }

  // Connection management
  connect(): void {
    if (this.socket && !this.socket.connected) {
      this.socket.connect()
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.leaveProject()
      this.socket.disconnect()
      this.currentUser = null
      this.currentProjectId = null
    }
  }

  // Status getters
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get currentProject(): string | null {
    return this.currentProjectId
  }

  get user(): User | null {
    return this.currentUser
  }

  // Cleanup
  destroy(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    this.eventHandlers = {}
    this.currentUser = null
    this.currentProjectId = null
  }
}

export const socketService = new SocketService()