import React, { useState } from 'react'
import { AlertTriangle, Check, X, Users, Clock } from 'lucide-react'
import type { User } from '../services/socketService'

interface ConflictData {
  id: string
  filePath: string
  localContent: string
  remoteContent: string
  remoteUser: User
  timestamp: Date
}

interface ConflictResolutionProps {
  conflict: ConflictData | null
  onResolve: (resolution: 'local' | 'remote' | 'merge', mergedContent?: string) => void
  onCancel: () => void
}

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflict,
  onResolve,
  onCancel
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge'>('local')
  const [mergedContent, setMergedContent] = useState('')
  const [showDiff, setShowDiff] = useState(false)

  if (!conflict) return null

  const handleResolve = () => {
    if (selectedResolution === 'merge') {
      onResolve('merge', mergedContent)
    } else {
      onResolve(selectedResolution)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Simple diff highlighting (basic implementation)
  const renderDiff = (local: string, remote: string) => {
    const localLines = local.split('\n')
    const remoteLines = remote.split('\n')
    const maxLines = Math.max(localLines.length, remoteLines.length)

    return (
      <div className="grid grid-cols-2 gap-4 text-sm font-mono">
        {/* Local version */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Your Version
          </h4>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-64 overflow-y-auto">
            {localLines.map((line, index) => (
              <div key={index} className="flex">
                <span className="text-gray-400 w-8 text-right mr-2">{index + 1}</span>
                <span className={remoteLines[index] !== line ? 'bg-blue-200' : ''}>
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Remote version */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            {conflict.remoteUser.username}'s Version
          </h4>
          <div className="bg-green-50 border border-green-200 rounded p-3 max-h-64 overflow-y-auto">
            {remoteLines.map((line, index) => (
              <div key={index} className="flex">
                <span className="text-gray-400 w-8 text-right mr-2">{index + 1}</span>
                <span className={localLines[index] !== line ? 'bg-green-200' : ''}>
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div className="conflict-resolution-overlay" onClick={onCancel} />
      
      {/* Dialog */}
      <div className="conflict-resolution-dialog">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Merge Conflict Detected</h2>
            <p className="text-sm text-gray-600 mt-1">
              You and <strong>{conflict.remoteUser.username}</strong> have made conflicting changes to{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">
                {conflict.filePath.split('/').pop()}
              </code>
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(conflict.timestamp)}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Conflict with {conflict.remoteUser.username}
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resolution options */}
        <div className="space-y-3 mb-4">
          <h3 className="font-medium text-gray-900">Choose how to resolve this conflict:</h3>
          
          {/* Keep local changes */}
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="resolution"
              value="local"
              checked={selectedResolution === 'local'}
              onChange={(e) => setSelectedResolution(e.target.value as 'local')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Keep your changes</div>
              <div className="text-sm text-gray-600">
                Discard {conflict.remoteUser.username}'s changes and keep your version
              </div>
            </div>
          </label>

          {/* Accept remote changes */}
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="resolution"
              value="remote"
              checked={selectedResolution === 'remote'}
              onChange={(e) => setSelectedResolution(e.target.value as 'remote')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Accept {conflict.remoteUser.username}'s changes</div>
              <div className="text-sm text-gray-600">
                Discard your changes and use {conflict.remoteUser.username}'s version
              </div>
            </div>
          </label>

          {/* Manual merge */}
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="resolution"
              value="merge"
              checked={selectedResolution === 'merge'}
              onChange={(e) => setSelectedResolution(e.target.value as 'merge')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Merge manually</div>
              <div className="text-sm text-gray-600 mb-2">
                Combine both versions by editing the content below
              </div>
              {selectedResolution === 'merge' && (
                <textarea
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  placeholder="Enter the merged content here..."
                  className="w-full h-32 p-2 border border-gray-300 rounded text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          </label>
        </div>

        {/* Diff view toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showDiff ? 'Hide' : 'Show'} detailed comparison
          </button>
        </div>

        {/* Diff view */}
        {showDiff && (
          <div className="mb-4">
            {renderDiff(conflict.localContent, conflict.remoteContent)}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={selectedResolution === 'merge' && !mergedContent.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Resolve Conflict
          </button>
        </div>
      </div>
    </>
  )
}

export default ConflictResolution