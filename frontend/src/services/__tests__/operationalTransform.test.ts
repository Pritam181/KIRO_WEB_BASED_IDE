import { describe, it, expect } from 'vitest'
import { OperationalTransform, DocumentState, TextOperation } from '../operationalTransform'

describe('OperationalTransform', () => {
  describe('transform', () => {
    it('should handle insert-insert operations', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'hello',
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const op2: TextOperation = {
        type: 'insert',
        position: 10,
        content: 'world',
        userId: 'user2',
        timestamp: Date.now(),
        id: 'op2'
      }

      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2)

      expect(transformed1.position).toBe(5)
      expect(transformed2.position).toBe(15) // Adjusted for op1's insertion
    })

    it('should handle insert-delete operations', () => {
      const insert: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'hello',
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const del: TextOperation = {
        type: 'delete',
        position: 10,
        length: 5,
        userId: 'user2',
        timestamp: Date.now(),
        id: 'op2'
      }

      const [transformedInsert, transformedDelete] = OperationalTransform.transform(insert, del)

      expect(transformedInsert.position).toBe(5)
      expect(transformedDelete.position).toBe(15) // Adjusted for insert
    })

    it('should handle delete-delete operations', () => {
      const op1: TextOperation = {
        type: 'delete',
        position: 5,
        length: 3,
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const op2: TextOperation = {
        type: 'delete',
        position: 10,
        length: 3,
        userId: 'user2',
        timestamp: Date.now(),
        id: 'op2'
      }

      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2)

      expect(transformed1.position).toBe(5)
      expect(transformed2.position).toBe(7) // Adjusted for op1's deletion
    })

    it('should not transform operations from the same user', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'hello',
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const op2: TextOperation = {
        type: 'insert',
        position: 10,
        content: 'world',
        userId: 'user1', // Same user
        timestamp: Date.now(),
        id: 'op2'
      }

      const [transformed1, transformed2] = OperationalTransform.transform(op1, op2)

      expect(transformed1).toEqual(op1)
      expect(transformed2).toEqual(op2)
    })
  })

  describe('applyOperation', () => {
    it('should apply insert operations correctly', () => {
      const text = 'Hello world'
      const operation: TextOperation = {
        type: 'insert',
        position: 6,
        content: 'beautiful ',
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const result = OperationalTransform.applyOperation(text, operation)
      expect(result).toBe('Hello beautiful world')
    })

    it('should apply delete operations correctly', () => {
      const text = 'Hello beautiful world'
      const operation: TextOperation = {
        type: 'delete',
        position: 6,
        length: 10, // 'beautiful '
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const result = OperationalTransform.applyOperation(text, operation)
      expect(result).toBe('Hello world')
    })

    it('should handle retain operations', () => {
      const text = 'Hello world'
      const operation: TextOperation = {
        type: 'retain',
        position: 0,
        userId: 'user1',
        timestamp: Date.now(),
        id: 'op1'
      }

      const result = OperationalTransform.applyOperation(text, operation)
      expect(result).toBe(text)
    })
  })

  describe('createOperation', () => {
    it('should detect insert operations', () => {
      const oldText = 'Hello world'
      const newText = 'Hello beautiful world'
      const operation = OperationalTransform.createOperation(oldText, newText, 'user1')

      expect(operation).toBeTruthy()
      expect(operation!.type).toBe('insert')
      expect(operation!.position).toBe(6)
      expect(operation!.content).toBe('beautiful ')
    })

    it('should detect delete operations', () => {
      const oldText = 'Hello beautiful world'
      const newText = 'Hello world'
      const operation = OperationalTransform.createOperation(oldText, newText, 'user1')

      expect(operation).toBeTruthy()
      expect(operation!.type).toBe('delete')
      expect(operation!.position).toBe(6)
      expect(operation!.length).toBe(10)
    })

    it('should return null for identical texts', () => {
      const text = 'Hello world'
      const operation = OperationalTransform.createOperation(text, text, 'user1')

      expect(operation).toBeNull()
    })
  })

  describe('compose', () => {
    it('should merge consecutive insert operations from same user', () => {
      const operations: TextOperation[] = [
        {
          type: 'insert',
          position: 5,
          content: 'hello',
          userId: 'user1',
          timestamp: 1000,
          id: 'op1'
        },
        {
          type: 'insert',
          position: 10,
          content: ' world',
          userId: 'user1',
          timestamp: 2000,
          id: 'op2'
        }
      ]

      const composed = OperationalTransform.compose(operations)

      expect(composed).toHaveLength(1)
      expect(composed[0].content).toBe('hello world')
      expect(composed[0].timestamp).toBe(2000)
    })

    it('should not merge operations from different users', () => {
      const operations: TextOperation[] = [
        {
          type: 'insert',
          position: 5,
          content: 'hello',
          userId: 'user1',
          timestamp: 1000,
          id: 'op1'
        },
        {
          type: 'insert',
          position: 10,
          content: ' world',
          userId: 'user2',
          timestamp: 2000,
          id: 'op2'
        }
      ]

      const composed = OperationalTransform.compose(operations)

      expect(composed).toHaveLength(2)
    })
  })
})

describe('DocumentState', () => {
  it('should initialize with content', () => {
    const doc = new DocumentState('Hello world')
    expect(doc.getContent()).toBe('Hello world')
    expect(doc.getVersion()).toBe(0)
  })

  it('should apply local operations', () => {
    const doc = new DocumentState('Hello world')
    const operation: TextOperation = {
      type: 'insert',
      position: 6,
      content: 'beautiful ',
      userId: 'user1',
      timestamp: Date.now(),
      id: 'op1'
    }

    doc.applyLocalOperation(operation)

    expect(doc.getContent()).toBe('Hello beautiful world')
    expect(doc.getVersion()).toBe(1)
    expect(doc.getPendingOperations()).toHaveLength(1)
  })

  it('should apply remote operations with transformation', () => {
    const doc = new DocumentState('Hello world')
    
    // Apply local operation first
    const localOp: TextOperation = {
      type: 'insert',
      position: 0,
      content: 'Hi ',
      userId: 'user1',
      timestamp: Date.now(),
      id: 'local1'
    }
    doc.applyLocalOperation(localOp)

    // Apply remote operation
    const remoteOp: TextOperation = {
      type: 'insert',
      position: 6,
      content: 'beautiful ',
      userId: 'user2',
      timestamp: Date.now(),
      id: 'remote1'
    }
    doc.applyRemoteOperation(remoteOp)

    // Should have both changes with proper transformation
    expect(doc.getContent()).toBe('Hi Hello beautiful world')
    expect(doc.getVersion()).toBe(2)
  })

  it('should acknowledge operations', () => {
    const doc = new DocumentState('Hello world')
    const operation: TextOperation = {
      type: 'insert',
      position: 6,
      content: 'beautiful ',
      userId: 'user1',
      timestamp: Date.now(),
      id: 'op1'
    }

    doc.applyLocalOperation(operation)
    expect(doc.getPendingOperations()).toHaveLength(1)

    doc.acknowledgeOperations(['op1'])
    expect(doc.getPendingOperations()).toHaveLength(0)
  })
})