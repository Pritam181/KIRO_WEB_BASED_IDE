import React, { useState } from 'react'
import { Wifi, WifiOff, Users, AlertCircle, RefreshCw, X } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'

interface ConnectionStatusProps {
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { 
    isConnected, 
    connectedUsers, 
    currentProject,
    connectionError,
    reconnectAttempts,
    connect,
    getUserCount
  } = useSocket()

  const [showDetails, setShowDetails] = useState(false)

  const handleRetryConnection = () => {
    connect()
  }

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500'
    if (reconnectAttempts > 0) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusText = () => {
    if (!isConnected && reconnectAttempts > 0) {
      return `Reconnecting... (${reconnectAttempts}/5)`
    }
    if (!isConnected) return 'Disconnected'
    return 'Connected'
  }

  if (!currentProject) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      {/* Status indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
          isConnected 
            ? 'border-green-200 bg-green-50 hover:bg-green-100' 
            : 'border-red-200 bg-red-50 hover:bg-red-100'
        }`}
      >
        {isConnected ? (
          <Wifi className={`w-4 h-4 ${getStatusColor()}`} />
        ) : (
          <WifiOff className={`w-4 h-4 ${getStatusColor()}`} />
        )}
        
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>

        {getUserCount() > 0 && (
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="w-3 h-3" />
            <span className="text-xs">{getUserCount()}</span>
          </div>
        )}
      </button>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Connection Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                  {isConnected ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{getStatusText()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Project:</span>
                <span className="text-sm font-mono text-gray-900">
                  {currentProject || 'None'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connected Users:</span>
                <span className="text-sm font-medium text-gray-900">
                  {getUserCount()}
                </span>
              </div>
            </div>

            {/* Error message */}
            {connectionError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Connection Error</p>
                    <p className="text-xs text-red-600 mt-1">{connectionError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Retry button */}
            {!isConnected && (
              <div className="mt-3">
                <button
                  onClick={handleRetryConnection}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Connection
                </button>
              </div>
            )}

            {/* Connected users list */}
            {connectedUsers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Active Users ({connectedUsers.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {connectedUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-gray-900">{user.username}</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full ml-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus