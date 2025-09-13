import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { config } from '../config/environment'

export interface ConnectedUser {
  id: string
  username: string
  avatarUrl?: string
  socketId: string
  projectId?: string
  lastSeen: Date
}

export interface ProjectRoom {
  id: string
  users: Map<string, ConnectedUser>
  createdAt: Date
}

class SocketService {
  private io: SocketIOServer | null = null
  private connectedUsers = new Map<string, ConnectedUser>()
  private projectRooms = new Map<string, ProjectRoom>()

  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupEventHandlers()
    console.log('🔌 Socket.io server initialized')
  }

  private setupEventHandlers(): void {
    if (!this.io) return

    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`)

      // Handle user authentication and joining
      socket.on('authenticate', (userData: { id: string; username: string; avatarUrl?: string }) => {
        const user: ConnectedUser = {
          ...userData,
          socketId: socket.id,
          lastSeen: new Date()
        }
        
        this.connectedUsers.set(socket.id, user)
        socket.emit('authenticated', { success: true, user })
        
        console.log(`✅ User authenticated: ${userData.username} (${socket.id})`)
      })

      // Handle joining project rooms
      socket.on('join-project', (projectId: string) => {
        const user = this.connectedUsers.get(socket.id)
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' })
          return
        }

        // Leave previous project room if any
        if (user.projectId) {
          this.leaveProjectRoom(socket.id, user.projectId)
        }

        // Join new project room
        this.joinProjectRoom(socket.id, projectId)
        socket.join(projectId)
        
        user.projectId = projectId
        this.connectedUsers.set(socket.id, user)

        // Notify other users in the room
        socket.to(projectId).emit('user-joined', {
          user: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl
          },
          timestamp: new Date()
        })

        // Send current room users to the joining user
        const room = this.projectRooms.get(projectId)
        if (room) {
          const roomUsers = Array.from(room.users.values()).map(u => ({
            id: u.id,
            username: u.username,
            avatarUrl: u.avatarUrl,
            lastSeen: u.lastSeen
          }))
          socket.emit('room-users', roomUsers)
        }

        console.log(`🏠 User ${user.username} joined project ${projectId}`)
      })

      // Handle leaving project rooms
      socket.on('leave-project', () => {
        const user = this.connectedUsers.get(socket.id)
        if (user && user.projectId) {
          this.leaveProjectRoom(socket.id, user.projectId)
          socket.leave(user.projectId)
          user.projectId = undefined
          this.connectedUsers.set(socket.id, user)
        }
      })

      // Handle file change notifications
      socket.on('file-change', (data: { 
        projectId: string
        filePath: string
        content: string
        userId: string
        timestamp: Date
      }) => {
        const user = this.connectedUsers.get(socket.id)
        if (!user || user.projectId !== data.projectId) {
          socket.emit('error', { message: 'Unauthorized file change' })
          return
        }

        // Broadcast to other users in the project
        socket.to(data.projectId).emit('file-updated', {
          filePath: data.filePath,
          content: data.content,
          updatedBy: {
            id: user.id,
            username: user.username
          },
          timestamp: data.timestamp
        })
      })

      // Handle cursor position sharing
      socket.on('cursor-position', (data: {
        projectId: string
        filePath: string
        position: { line: number; column: number }
        selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
      }) => {
        const user = this.connectedUsers.get(socket.id)
        if (!user || user.projectId !== data.projectId) return

        // Broadcast cursor position to other users in the same file
        socket.to(data.projectId).emit('cursor-update', {
          filePath: data.filePath,
          user: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl
          },
          position: data.position,
          selection: data.selection,
          timestamp: new Date()
        })
      })

      // Handle user activity updates
      socket.on('user-activity', (activity: { type: 'typing' | 'idle' | 'active'; filePath?: string }) => {
        const user = this.connectedUsers.get(socket.id)
        if (!user || !user.projectId) return

        user.lastSeen = new Date()
        this.connectedUsers.set(socket.id, user)

        // Broadcast activity to project room
        socket.to(user.projectId).emit('user-activity-update', {
          user: {
            id: user.id,
            username: user.username
          },
          activity: activity.type,
          filePath: activity.filePath,
          timestamp: new Date()
        })
      })

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`👋 User disconnected: ${socket.id} (${reason})`)
        
        const user = this.connectedUsers.get(socket.id)
        if (user) {
          // Leave project room if in one
          if (user.projectId) {
            this.leaveProjectRoom(socket.id, user.projectId)
            
            // Notify other users
            socket.to(user.projectId).emit('user-left', {
              user: {
                id: user.id,
                username: user.username
              },
              timestamp: new Date()
            })
          }
          
          // Remove from connected users
          this.connectedUsers.delete(socket.id)
        }
      })

      // Handle reconnection attempts
      socket.on('reconnect-attempt', () => {
        console.log(`🔄 Reconnection attempt from ${socket.id}`)
      })
    })
  }

  private joinProjectRoom(socketId: string, projectId: string): void {
    const user = this.connectedUsers.get(socketId)
    if (!user) return

    // Get or create project room
    let room = this.projectRooms.get(projectId)
    if (!room) {
      room = {
        id: projectId,
        users: new Map(),
        createdAt: new Date()
      }
      this.projectRooms.set(projectId, room)
    }

    // Add user to room
    room.users.set(socketId, user)
  }

  private leaveProjectRoom(socketId: string, projectId: string): void {
    const room = this.projectRooms.get(projectId)
    if (!room) return

    // Remove user from room
    room.users.delete(socketId)

    // Clean up empty rooms
    if (room.users.size === 0) {
      this.projectRooms.delete(projectId)
    }
  }

  // Public methods for external use
  public broadcastToProject(projectId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(projectId).emit(event, data)
    }
  }

  public getProjectUsers(projectId: string): ConnectedUser[] {
    const room = this.projectRooms.get(projectId)
    return room ? Array.from(room.users.values()) : []
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  public getActiveProjectsCount(): number {
    return this.projectRooms.size
  }

  public isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).some(user => user.id === userId)
  }
}

export const socketService = new SocketService()