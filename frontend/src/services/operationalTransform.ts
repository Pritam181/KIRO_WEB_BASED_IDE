/**
 * Operational Transformation (OT) for collaborative text editing
 * Based on the OT algorithm for handling concurrent text operations
 */

export interface TextOperation {
  type: 'insert' | 'delete' | 'retain'
  position: number
  content?: string
  length?: number
  userId: string
  timestamp: number
  id: string
}

export interface TransformResult {
  operation: TextOperation
  transformed: boolean
}

export class OperationalTransform {
  /**
   * Transform an operation against another operation
   * This is the core of OT - ensuring operations can be applied in any order
   */
  static transform(op1: TextOperation, op2: TextOperation): [TextOperation, TextOperation] {
    // If operations are from the same user, no transformation needed
    if (op1.userId === op2.userId) {
      return [op1, op2]
    }

    const transformedOp1 = { ...op1 }
    const transformedOp2 = { ...op2 }

    // Transform based on operation types
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this.transformInsertInsert(transformedOp1, transformedOp2)
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      return this.transformInsertDelete(transformedOp1, transformedOp2)
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      const [transformed2, transformed1] = this.transformInsertDelete(transformedOp2, transformedOp1)
      return [transformed1, transformed2]
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      return this.transformDeleteDelete(transformedOp1, transformedOp2)
    }

    return [transformedOp1, transformedOp2]
  }

  private static transformInsertInsert(op1: TextOperation, op2: TextOperation): [TextOperation, TextOperation] {
    if (op1.position <= op2.position) {
      // op1 comes before op2, adjust op2's position
      op2.position += op1.content?.length || 0
    } else {
      // op2 comes before op1, adjust op1's position
      op1.position += op2.content?.length || 0
    }
    return [op1, op2]
  }

  private static transformInsertDelete(insert: TextOperation, del: TextOperation): [TextOperation, TextOperation] {
    if (insert.position <= del.position) {
      // Insert comes before delete, adjust delete position
      del.position += insert.content?.length || 0
    } else if (insert.position < del.position + (del.length || 0)) {
      // Insert is within the deleted range, adjust insert position
      insert.position = del.position
    } else {
      // Insert comes after delete, adjust insert position
      insert.position -= del.length || 0
    }
    return [insert, del]
  }

  private static transformDeleteDelete(op1: TextOperation, op2: TextOperation): [TextOperation, TextOperation] {
    const op1End = op1.position + (op1.length || 0)
    const op2End = op2.position + (op2.length || 0)

    if (op1End <= op2.position) {
      // op1 comes completely before op2
      op2.position -= op1.length || 0
    } else if (op2End <= op1.position) {
      // op2 comes completely before op1
      op1.position -= op2.length || 0
    } else {
      // Overlapping deletes - need to handle carefully
      const overlapStart = Math.max(op1.position, op2.position)
      const overlapEnd = Math.min(op1End, op2End)
      const overlapLength = overlapEnd - overlapStart

      if (op1.position < op2.position) {
        // op1 starts first
        op1.length = (op1.length || 0) - overlapLength
        op2.position = op1.position + (op1.length || 0)
        op2.length = (op2.length || 0) - overlapLength
      } else {
        // op2 starts first
        op2.length = (op2.length || 0) - overlapLength
        op1.position = op2.position + (op2.length || 0)
        op1.length = (op1.length || 0) - overlapLength
      }
    }

    return [op1, op2]
  }

  /**
   * Apply an operation to a text string
   */
  static applyOperation(text: string, operation: TextOperation): string {
    switch (operation.type) {
      case 'insert':
        return (
          text.slice(0, operation.position) +
          (operation.content || '') +
          text.slice(operation.position)
        )
      case 'delete':
        return (
          text.slice(0, operation.position) +
          text.slice(operation.position + (operation.length || 0))
        )
      case 'retain':
        return text
      default:
        return text
    }
  }

  /**
   * Create an operation from a text change
   */
  static createOperation(
    oldText: string,
    newText: string,
    userId: string,
    cursorPosition?: number
  ): TextOperation | null {
    // Simple diff algorithm to detect the change
    let position = 0
    const minLength = Math.min(oldText.length, newText.length)

    // Find the first difference
    while (position < minLength && oldText[position] === newText[position]) {
      position++
    }

    // If no difference found and lengths are equal, no operation needed
    if (position === minLength && oldText.length === newText.length) {
      return null
    }

    const id = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Determine if it's an insert or delete
    if (oldText.length < newText.length) {
      // Insert operation
      const insertedText = newText.slice(position, position + (newText.length - oldText.length))
      return {
        type: 'insert',
        position,
        content: insertedText,
        userId,
        timestamp: Date.now(),
        id
      }
    } else if (oldText.length > newText.length) {
      // Delete operation
      const deletedLength = oldText.length - newText.length
      return {
        type: 'delete',
        position,
        length: deletedLength,
        userId,
        timestamp: Date.now(),
        id
      }
    } else {
      // Replace operation (delete + insert)
      // For simplicity, we'll treat this as a delete followed by an insert
      const deletedLength = oldText.length - position - (newText.length - position)
      if (deletedLength > 0) {
        return {
          type: 'delete',
          position,
          length: deletedLength,
          userId,
          timestamp: Date.now(),
          id
        }
      }
    }

    return null
  }

  /**
   * Compose multiple operations into a single operation
   */
  static compose(operations: TextOperation[]): TextOperation[] {
    if (operations.length <= 1) return operations

    const composed: TextOperation[] = []
    let current = operations[0]

    for (let i = 1; i < operations.length; i++) {
      const next = operations[i]

      // Try to merge consecutive operations from the same user
      if (current.userId === next.userId && current.type === next.type) {
        if (current.type === 'insert' && next.type === 'insert') {
          // Merge consecutive inserts
          if (current.position + (current.content?.length || 0) === next.position) {
            current = {
              ...current,
              content: (current.content || '') + (next.content || ''),
              timestamp: Math.max(current.timestamp, next.timestamp)
            }
            continue
          }
        } else if (current.type === 'delete' && next.type === 'delete') {
          // Merge consecutive deletes
          if (current.position === next.position) {
            current = {
              ...current,
              length: (current.length || 0) + (next.length || 0),
              timestamp: Math.max(current.timestamp, next.timestamp)
            }
            continue
          }
        }
      }

      composed.push(current)
      current = next
    }

    composed.push(current)
    return composed
  }
}

/**
 * Manages the operational transformation state for a document
 */
export class DocumentState {
  private operations: TextOperation[] = []
  private content: string = ''
  private version: number = 0

  constructor(initialContent: string = '') {
    this.content = initialContent
  }

  /**
   * Apply a local operation (from this user)
   */
  applyLocalOperation(operation: TextOperation): void {
    this.content = OperationalTransform.applyOperation(this.content, operation)
    this.operations.push(operation)
    this.version++
  }

  /**
   * Apply a remote operation (from another user)
   */
  applyRemoteOperation(operation: TextOperation): void {
    // Transform the remote operation against all pending local operations
    let transformedOperation = operation

    for (const localOp of this.operations) {
      const [, transformed] = OperationalTransform.transform(localOp, transformedOperation)
      transformedOperation = transformed
    }

    this.content = OperationalTransform.applyOperation(this.content, transformedOperation)
    this.version++
  }

  /**
   * Get the current document content
   */
  getContent(): string {
    return this.content
  }

  /**
   * Get the current version
   */
  getVersion(): number {
    return this.version
  }

  /**
   * Clear acknowledged operations
   */
  acknowledgeOperations(operationIds: string[]): void {
    this.operations = this.operations.filter(op => !operationIds.includes(op.id))
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): TextOperation[] {
    return [...this.operations]
  }
}