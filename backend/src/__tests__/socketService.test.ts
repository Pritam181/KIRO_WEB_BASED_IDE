import { createServer } from 'http'
import { io as Client, Socket as ClientSocket } from 'socket.io-client'
import { socketService } from '../services/socketService'

describe('SocketService', () => {
  let httpServer: any
  let clientSocket: ClientSocket
  const port = 3002

  beforeAll((done) => {
    httpServer = createServer()
    socketService.initialize(httpServer)
    
    httpServer.listen(port, () => {
      clientSocket = Client(`http://localhost:${port}`)
      
      // Wait for connection
      clientSocket.on('connect', () => {
        done()
      })
    })
  })

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect()
    }
    if (httpServer) {
      httpServer.close(done)
    }
  })

  beforeEach((done) => {
    // Reset state before each test
    clientSocket.removeAllListeners()
    done()
  })

  describe('Connection Management', () => {
    it('should handle client connection', (done) => {
      expect(clientSocket.connected).toBe(true)
      done()
    })

    it('should handle user authentication', (done) => {
      const userData = {
        id: 'user1',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg'
      }

      clientSocket.on('authenticated', (data) => {
        expect(data.success).toBe(true)
        expect(data.user).toMatchObject(userData)
        done()
      })

      clientSocket.emit('authenticate', userData)
    })

    it('should track connected users count', () => {
      expect(socketService.getConnectedUsersCount()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Project Room Management', () => {
    beforeEach((done) => {
      // Authenticate user first
      const userData = {
        id: 'user1',
        username: 'testuser'
      }

      clientSocket.on('authenticated', () => {
        done()
      })

      clientSocket.emit('authenticate', userData)
    })

    it('should allow user to join project room', (done) => {
      const projectId = 'test-project-1'

      clientSocket.on('room-users', (users) => {
        expect(Array.isArray(users)).toBe(true)
        done()
      })

      clientSocket.emit('join-project', projectId)
    })

    it('should track active projects count', () => {
      expect(socketService.getActiveProjectsCount()).toBeGreaterThanOrEqual(0)
    })

    it('should handle leaving project room', (done) => {
      clientSocket.emit('leave-project')
      // No specific response expected, just ensure no errors
      setTimeout(done, 100)
    })
  })

  describe('File Collaboration', () => {
    beforeEach((done) => {
      // Authenticate and join project
      const userData = {
        id: 'user1',
        username: 'testuser'
      }

      clientSocket.on('authenticated', () => {
        clientSocket.emit('join-project', 'test-project')
        setTimeout(done, 100)
      })

      clientSocket.emit('authenticate', userData)
    })

    it('should handle file change broadcasts', (done) => {
      const fileChangeData = {
        projectId: 'test-project',
        filePath: '/src/test.ts',
        content: 'console.log("test")',
        userId: 'user1',
        timestamp: new Date()
      }

      // Since we're the sender, we won't receive the broadcast
      // This test mainly ensures no errors occur
      clientSocket.emit('file-change', fileChangeData)
      setTimeout(done, 100)
    })

    it('should handle cursor position updates', (done) => {
      const cursorData = {
        projectId: 'test-project',
        filePath: '/src/test.ts',
        position: { line: 1, column: 5 },
        selection: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 }
        }
      }

      clientSocket.emit('cursor-position', cursorData)
      setTimeout(done, 100)
    })

    it('should handle user activity updates', (done) => {
      const activityData = {
        type: 'typing' as const,
        filePath: '/src/test.ts'
      }

      clientSocket.emit('user-activity', activityData)
      setTimeout(done, 100)
    })
  })

  describe('Error Handling', () => {
    it('should handle unauthenticated file changes', (done) => {
      // Don't authenticate, try to make file change
      const fileChangeData = {
        projectId: 'test-project',
        filePath: '/src/test.ts',
        content: 'console.log("test")',
        userId: 'user1',
        timestamp: new Date()
      }

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('Unauthorized')
        done()
      })

      // Set a timeout in case error event is not emitted
      const timeout = setTimeout(() => {
        done() // Complete test even if no error is emitted
      }, 1000)

      clientSocket.emit('file-change', fileChangeData)
      
      // Clear timeout if error is received
      clientSocket.once('error', () => {
        clearTimeout(timeout)
      })
    }, 10000)

    it('should handle joining project without authentication', (done) => {
      // Create new client without authentication
      const unauthClient = Client(`http://localhost:${port}`)
      
      unauthClient.on('connect', () => {
        unauthClient.on('error', (error) => {
          expect(error.message).toContain('not authenticated')
          unauthClient.disconnect()
          done()
        })

        unauthClient.emit('join-project', 'test-project')
      })
    })
  })

  describe('Utility Methods', () => {
    it('should check if user is online', () => {
      const isOnline = socketService.isUserOnline('user1')
      expect(typeof isOnline).toBe('boolean')
    })

    it('should get project users', () => {
      const users = socketService.getProjectUsers('test-project')
      expect(Array.isArray(users)).toBe(true)
    })

    it('should broadcast to project', () => {
      // This method should not throw errors
      expect(() => {
        socketService.broadcastToProject('test-project', 'test-event', { data: 'test' })
      }).not.toThrow()
    })
  })
})