import React, { useState, useEffect } from 'react'
import { Clock, Edit3, Eye, Users, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import type { User } from '../services/socketService'

interface ActivityEvent {
  id: string
  type: 'user-joined' | 'user-left' | 'file-updated' | 'user-activity'
  user: User
  timestamp: Date
  filePath?: string
  activity?: 'typing' | 'idle' | 'active'
}

interface UserActivityFeedProps {
  className?: string
  maxEvents?: number
  showTimestamps?: boolean
  collapsible?: boolean
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({
  className = '',
  maxEvents = 20,
  showTimestamps = true,
  collapsible = true
}) => {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { on, off, connectedUsers } = useSocket()

  // Add new event to the feed
  const addEvent = (event: ActivityEvent) => {
    setEvents(prev => {
      const newEvents = [event, ...prev].slice(0, maxEvents)
      return newEvents
    })
  }

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  // Get activity icon
  const getActivityIcon = (event: ActivityEvent) => {
    switch (event.type) {
      case 'user-joined':
        return <Users className="w-3 h-3 text-green-500" />
      case 'user-left':
        return <Users className="w-3 h-3 text-red-500" />
      case 'file-updated':
        return <Edit3 className="w-3 h-3 text-blue-500" />
      case 'user-activity':
        if (event.activity === 'typing') {
          return <Edit3 className="w-3 h-3 text-orange-500" />
        } else if (event.activity === 'active') {
          return <Eye className="w-3 h-3 text-green-500" />
        } else {
          return <Clock className="w-3 h-3 text-gray-400" />
        }
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  // Get activity description
  const getActivityDescription = (event: ActivityEvent) => {
    const fileName = event.filePath ? event.filePath.split('/').pop() : ''
    
    switch (event.type) {
      case 'user-joined':
        return `${event.user.username} joined the project`
      case 'user-left':
        return `${event.user.username} left the project`
      case 'file-updated':
        return `${event.user.username} updated ${fileName}`
      case 'user-activity':
        if (event.activity === 'typing') {
          return `${event.user.username} is typing in ${fileName}`
        } else if (event.activity === 'active') {
          return `${event.user.username} is viewing ${fileName}`
        } else {
          return `${event.user.username} went idle`
        }
      default:
        return 'Unknown activity'
    }
  }

  // Set up event listeners
  useEffect(() => {
    const handleUserJoined = (data: any) => {
      addEvent({
        id: `joined-${data.user.id}-${Date.now()}`,
        type: 'user-joined',
        user: data.user,
        timestamp: new Date(data.timestamp)
      })
    }

    const handleUserLeft = (data: any) => {
      addEvent({
        id: `left-${data.user.id}-${Date.now()}`,
        type: 'user-left',
        user: data.user,
        timestamp: new Date(data.timestamp)
      })
    }

    const handleFileUpdated = (data: any) => {
      addEvent({
        id: `file-${data.updatedBy.id}-${Date.now()}`,
        type: 'file-updated',
        user: data.updatedBy,
        timestamp: new Date(data.timestamp),
        filePath: data.filePath
      })
    }

    const handleUserActivity = (data: any) => {
      // Only show typing activities to reduce noise
      if (data.activity === 'typing') {
        addEvent({
          id: `activity-${data.user.id}-${Date.now()}`,
          type: 'user-activity',
          user: data.user,
          timestamp: new Date(data.timestamp),
          filePath: data.filePath,
          activity: data.activity
        })
      }
    }

    on('user-joined', handleUserJoined)
    on('user-left', handleUserLeft)
    on('file-updated', handleFileUpdated)
    on('user-activity-update', handleUserActivity)

    return () => {
      off('user-joined')
      off('user-left')
      off('file-updated')
      off('user-activity-update')
    }
  }, [on, off])

  // Clean up old events periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      setEvents(prev => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        return prev.filter(event => event.timestamp > cutoff)
      })
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(cleanup)
  }, [])

  if (events.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 text-sm ${className}`}>
        <Clock className="w-4 h-4 mx-auto mb-2 opacity-50" />
        No recent activity
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="font-medium text-gray-900 text-sm">Activity Feed</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {events.length}
          </span>
        </div>
        
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Activity list */}
      {!isCollapsed && (
        <div className="activity-feed max-h-64 overflow-y-auto">
          {events.map((event) => {
            const isRecent = Date.now() - event.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
            
            return (
              <div
                key={event.id}
                className={`activity-item flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0 ${
                  isRecent ? 'bg-blue-50' : ''
                }`}
              >
                {/* User avatar */}
                <div className="flex-shrink-0">
                  {event.user.avatarUrl ? (
                    <img
                      src={event.user.avatarUrl}
                      alt={event.user.username}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {event.user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Activity content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {getActivityIcon(event)}
                    <div className="flex-1">
                      <p className={`text-sm ${isRecent ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {getActivityDescription(event)}
                      </p>
                      {showTimestamps && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(event.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer with connected users count */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{connectedUsers.length} users connected</span>
          <button
            onClick={() => setEvents([])}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear activity feed"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserActivityFeed