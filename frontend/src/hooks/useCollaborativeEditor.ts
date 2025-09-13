import { useEffect, useRef, useCallback, useState } from 'react'
import { editor } from 'monaco-editor'
import { useSocket } from './useSocket'
import { OperationalTransform, DocumentState, TextOperation } from '../services/operationalTransform'
import type { User } from '../services/socketService'

interface CollaborativeCursor {
  userId: string
  username: string
  position: { line: number; column: number }
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
  color: string
  lastUpdate: Date
}

interface UseCollaborativeEditorOptions {
  filePath: string
  initialContent?: string
  user: User | null
  debounceMs?: number
}

interface CollaborativeEditorState {
  cursors: Map<string, CollaborativeCursor>
  isReceivingRemoteChange: boolean
  documentState: DocumentState
  lastSentContent: string
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

export function useCollaborativeEditor({
  filePath,
  initialContent = '',
  user,
  debounceMs = 300
}: UseCollaborativeEditorOptions) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [state, setState] = useState<CollaborativeEditorState>({
    cursors: new Map(),
    isReceivingRemoteChange: false,
    documentState: new DocumentState(initialContent),
    lastSentContent: initialContent
  })

  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const cursorColorMapRef = useRef<Map<string, string>>(new Map())

  const {
    broadcastFileChange,
    broadcastCursorPosition,
    broadcastUserActivity,
    on,
    off,
    isConnected
  } = useSocket()

  // Get or assign a color for a user
  const getUserColor = useCallback((userId: string): string => {
    if (!cursorColorMapRef.current.has(userId)) {
      const colorIndex = cursorColorMapRef.current.size % CURSOR_COLORS.length
      cursorColorMapRef.current.set(userId, CURSOR_COLORS[colorIndex])
    }
    return cursorColorMapRef.current.get(userId)!
  }, [])

  // Handle remote file updates
  const handleRemoteFileUpdate = useCallback((event: any) => {
    if (event.filePath !== filePath || !editorRef.current || !user) return
    if (event.updatedBy.id === user.id) return // Ignore our own changes

    setState(prevState => {
      const newState = { ...prevState, isReceivingRemoteChange: true }
      
      // Create operation from the remote change
      const currentContent = editorRef.current!.getValue()
      const operation = OperationalTransform.createOperation(
        currentContent,
        event.content,
        event.updatedBy.id
      )

      if (operation) {
        newState.documentState.applyRemoteOperation(operation)
        
        // Update editor content
        const newContent = newState.documentState.getContent()
        if (newContent !== currentContent) {
          const position = editorRef.current!.getPosition()
          editorRef.current!.setValue(newContent)
          if (position) {
            editorRef.current!.setPosition(position)
          }
        }
      }

      return newState
    })

    // Reset the flag after a short delay
    setTimeout(() => {
      setState(prev => ({ ...prev, isReceivingRemoteChange: false }))
    }, 100)
  }, [filePath, user])

  // Handle remote cursor updates
  const handleRemoteCursorUpdate = useCallback((event: any) => {
    if (event.filePath !== filePath || !user) return
    if (event.user.id === user.id) return // Ignore our own cursor

    setState(prevState => {
      const newCursors = new Map(prevState.cursors)
      const color = getUserColor(event.user.id)
      
      newCursors.set(event.user.id, {
        userId: event.user.id,
        username: event.user.username,
        position: event.position,
        selection: event.selection,
        color,
        lastUpdate: new Date(event.timestamp)
      })

      return { ...prevState, cursors: newCursors }
    })
  }, [filePath, user, getUserColor])

  // Handle user activity updates
  const handleUserActivity = useCallback((event: any) => {
    if (event.filePath !== filePath || !user) return
    if (event.user.id === user.id) return

    // Update cursor activity state
    setState(prevState => {
      const newCursors = new Map(prevState.cursors)
      const existingCursor = newCursors.get(event.user.id)
      
      if (existingCursor) {
        newCursors.set(event.user.id, {
          ...existingCursor,
          lastUpdate: new Date(event.timestamp)
        })
      }

      return { ...prevState, cursors: newCursors }
    })
  }, [filePath, user])

  // Handle user leaving
  const handleUserLeft = useCallback((event: any) => {
    setState(prevState => {
      const newCursors = new Map(prevState.cursors)
      newCursors.delete(event.user.id)
      return { ...prevState, cursors: newCursors }
    })
  }, [])

  // Set up socket event listeners
  useEffect(() => {
    on('file-updated', handleRemoteFileUpdate)
    on('cursor-update', handleRemoteCursorUpdate)
    on('user-activity-update', handleUserActivity)
    on('user-left', handleUserLeft)

    return () => {
      off('file-updated')
      off('cursor-update')
      off('user-activity-update')
      off('user-left')
    }
  }, [on, off, handleRemoteFileUpdate, handleRemoteCursorUpdate, handleUserActivity, handleUserLeft])

  // Broadcast content changes
  const broadcastContentChange = useCallback((content: string) => {
    if (!isConnected || state.isReceivingRemoteChange) return

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce the broadcast
    debounceTimerRef.current = setTimeout(() => {
      if (content !== state.lastSentContent) {
        broadcastFileChange(filePath, content)
        setState(prev => ({ ...prev, lastSentContent: content }))
      }
    }, debounceMs)
  }, [isConnected, state.isReceivingRemoteChange, state.lastSentContent, broadcastFileChange, filePath, debounceMs])

  // Broadcast cursor position
  const broadcastCursor = useCallback((position: { line: number; column: number }, selection?: any) => {
    if (!isConnected || state.isReceivingRemoteChange) return

    broadcastCursorPosition(filePath, position, selection)
  }, [isConnected, state.isReceivingRemoteChange, broadcastCursorPosition, filePath])

  // Initialize editor with collaborative features
  const initializeEditor = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // Handle content changes
    const contentChangeDisposable = editor.onDidChangeModelContent((e) => {
      if (state.isReceivingRemoteChange) return

      const content = editor.getValue()
      broadcastContentChange(content)
      broadcastUserActivity('typing', filePath)
    })

    // Handle cursor position changes
    const cursorChangeDisposable = editor.onDidChangeCursorPosition((e) => {
      if (state.isReceivingRemoteChange) return

      const position = e.position
      const selection = editor.getSelection()
      
      broadcastCursor(
        { line: position.lineNumber, column: position.column },
        selection ? {
          start: { line: selection.startLineNumber, column: selection.startColumn },
          end: { line: selection.endLineNumber, column: selection.endColumn }
        } : undefined
      )
    })

    // Handle selection changes
    const selectionChangeDisposable = editor.onDidChangeCursorSelection((e) => {
      if (state.isReceivingRemoteChange) return

      const selection = e.selection
      const position = editor.getPosition()
      
      if (position) {
        broadcastCursor(
          { line: position.lineNumber, column: position.column },
          {
            start: { line: selection.startLineNumber, column: selection.startColumn },
            end: { line: selection.endLineNumber, column: selection.endColumn }
          }
        )
      }
    })

    // Handle focus/blur for activity tracking
    const focusDisposable = editor.onDidFocusEditorText(() => {
      broadcastUserActivity('active', filePath)
    })

    const blurDisposable = editor.onDidBlurEditorText(() => {
      broadcastUserActivity('idle', filePath)
    })

    // Cleanup function
    return () => {
      contentChangeDisposable.dispose()
      cursorChangeDisposable.dispose()
      selectionChangeDisposable.dispose()
      focusDisposable.dispose()
      blurDisposable.dispose()
    }
  }, [state.isReceivingRemoteChange, broadcastContentChange, broadcastCursor, broadcastUserActivity, filePath])

  // Render cursor decorations
  const renderCursorDecorations = useCallback(() => {
    if (!editorRef.current) return

    const decorations: editor.IModelDeltaDecoration[] = []

    state.cursors.forEach((cursor) => {
      // Only show cursors that have been updated recently (within 30 seconds)
      const timeSinceUpdate = Date.now() - cursor.lastUpdate.getTime()
      if (timeSinceUpdate > 30000) return

      // Cursor position decoration
      decorations.push({
        range: {
          startLineNumber: cursor.position.line,
          startColumn: cursor.position.column,
          endLineNumber: cursor.position.line,
          endColumn: cursor.position.column + 1
        },
        options: {
          className: 'collaborative-cursor',
          beforeContentClassName: 'collaborative-cursor-line',
          afterContentClassName: 'collaborative-cursor-label',
          after: {
            content: cursor.username,
            inlineClassName: 'collaborative-cursor-name'
          },
          stickiness: editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      })

      // Selection decoration
      if (cursor.selection && 
          (cursor.selection.start.line !== cursor.selection.end.line || 
           cursor.selection.start.column !== cursor.selection.end.column)) {
        decorations.push({
          range: {
            startLineNumber: cursor.selection.start.line,
            startColumn: cursor.selection.start.column,
            endLineNumber: cursor.selection.end.line,
            endColumn: cursor.selection.end.column
          },
          options: {
            className: 'collaborative-selection',
            stickiness: editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        })
      }
    })

    editorRef.current.deltaDecorations([], decorations)
  }, [state.cursors])

  // Update decorations when cursors change
  useEffect(() => {
    renderCursorDecorations()
  }, [renderCursorDecorations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    initializeEditor,
    cursors: Array.from(state.cursors.values()),
    isReceivingRemoteChange: state.isReceivingRemoteChange,
    documentVersion: state.documentState.getVersion(),
    connectedUsers: state.cursors.size
  }
}