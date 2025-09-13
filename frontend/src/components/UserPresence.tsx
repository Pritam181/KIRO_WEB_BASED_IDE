import React from 'react'
import { Users, Wifi, WifiOff, Clock } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import type { ConnectedUser } from '../services/socketService'

interface UserPresenceProps {
  className?: string
  showDetails?: boolean
}

interface UserAvatarProps {
  user: ConnectedUser
  size?: 'sm' | 'md' | 'lg'
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return 'Yesterday'
  }

  return (
    <div className="relative group">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          className={`${sizeClasses[size]} rounded-full border-2 border-green-400 object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full border-2 border-green-400 bg-blue-500 flex items-center justify-center text-white font-medium`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}
      
      {/* Online indicator */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
        <div className="font-medium">{user.username}</div>
        <div className="text-gray-300 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatLastSeen(user.lastSeen)}
        </div>
      </div>
    </div>
  )
}

export const UserPresence: React.FC<UserPresenceProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const { 
    isConnected, 
    connectedUsers, 
    currentProject, 
    connectionError,
    reconnectAttempts 
  } = useSocket()

  if (!currentProject) {
    return null
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Connection status */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <div className="flex items-center gap-1 text-green-600">
            <Wifi className="w-4 h-4" />
            {showDetails && <span className="text-sm">Connected</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <WifiOff className="w-4 h-4" />
            {showDetails && (
              <span className="text-sm">
                {reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts})` : 'Disconnected'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* User count and avatars */}
      {connectedUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="w-4 h-4" />
            {showDetails && (
              <span className="text-sm">
                {connectedUsers.length} {connectedUsers.length === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>
          
          {/* User avatars */}
          <div className="flex -space-x-2">
            {connectedUsers.slice(0, 5).map((user) => (
              <UserAvatar key={user.id} user={user} size="sm" />
            ))}
            {connectedUsers.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium">
                +{connectedUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection error */}
      {connectionError && showDetails && (
        <div className="text-red-600 text-sm">
          Error: {connectionError}
        </div>
      )}
    </div>
  )
}

export default UserPresence