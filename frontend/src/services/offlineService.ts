interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  method: string;
  url: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: string;
  retryCount: number;
}

interface OfflineData {
  files: Record<string, any>;
  projects: Record<string, any>;
  lastSync: string;
}

class OfflineService {
  private dbName = 'kiro-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('pending-operations')) {
          db.createObjectStore('pending-operations', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('cached-files')) {
          db.createObjectStore('cached-files', { keyPath: 'path' });
        }

        if (!db.objectStoreNames.contains('cached-projects')) {
          db.createObjectStore('cached-projects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('offline-data')) {
          db.createObjectStore('offline-data', { keyPath: 'key' });
        }
      };
    });
  }

  // Register service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });

        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  // Handle messages from service worker
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'SYNC_COMPLETE':
        console.log('Offline sync completed:', data);
        this.notifySyncComplete(data.syncedOperations);
        break;

      case 'CACHE_UPDATED':
        console.log('Cache updated:', data);
        break;

      default:
        console.log('Unknown service worker message:', type, data);
    }
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Add pending operation for offline sync
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) await this.initialize();

    const pendingOperation: PendingOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['pending-operations'], 'readwrite');
      const store = transaction.objectStore('pending-operations');
      const request = store.add(pendingOperation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending operations
  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['pending-operations'], 'readonly');
      const store = transaction.objectStore('pending-operations');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove pending operation
  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['pending-operations'], 'readwrite');
      const store = transaction.objectStore('pending-operations');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache file data
  async cacheFile(projectId: string, filePath: string, content: string, metadata: any): Promise<void> {
    if (!this.db) await this.initialize();

    const fileData = {
      path: `${projectId}/${filePath}`,
      projectId,
      filePath,
      content,
      metadata,
      cachedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['cached-files'], 'readwrite');
      const store = transaction.objectStore('cached-files');
      const request = store.put(fileData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached file
  async getCachedFile(projectId: string, filePath: string): Promise<any | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['cached-files'], 'readonly');
      const store = transaction.objectStore('cached-files');
      const request = store.get(`${projectId}/${filePath}`);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache project data
  async cacheProject(project: any): Promise<void> {
    if (!this.db) await this.initialize();

    const projectData = {
      ...project,
      cachedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['cached-projects'], 'readwrite');
      const store = transaction.objectStore('cached-projects');
      const request = store.put(projectData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached projects
  async getCachedProjects(): Promise<any[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['cached-projects'], 'readonly');
      const store = transaction.objectStore('cached-projects');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync when back online
  async syncWhenOnline(): Promise<void> {
    if (!this.isOnline()) {
      console.log('Still offline, skipping sync');
      return;
    }

    try {
      const pendingOperations = await this.getPendingOperations();
      console.log(`Syncing ${pendingOperations.length} pending operations`);

      for (const operation of pendingOperations) {
        try {
          await this.executeOperation(operation);
          await this.removePendingOperation(operation.id);
          console.log('Synced operation:', operation);
        } catch (error) {
          console.error('Failed to sync operation:', operation, error);
          
          // Increment retry count
          operation.retryCount++;
          
          // Remove operation if too many retries
          if (operation.retryCount >= 3) {
            await this.removePendingOperation(operation.id);
            console.log('Removed operation after max retries:', operation);
          }
        }
      }

      // Update last sync time
      await this.setOfflineData('lastSync', new Date().toISOString());
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Execute pending operation
  private async executeOperation(operation: PendingOperation): Promise<any> {
    const response = await fetch(operation.url, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        ...operation.headers,
      },
      body: operation.body ? JSON.stringify(operation.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Set offline data
  async setOfflineData(key: string, value: any): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['offline-data'], 'readwrite');
      const store = transaction.objectStore('offline-data');
      const request = store.put({ key, value, updatedAt: new Date().toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline data
  async getOfflineData(key: string): Promise<any | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['offline-data'], 'readonly');
      const store = transaction.objectStore('offline-data');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['pending-operations', 'cached-files', 'cached-projects', 'offline-data'], 'readwrite');
      
      const stores = ['pending-operations', 'cached-files', 'cached-projects', 'offline-data'];
      const promises = stores.map(storeName => {
        const store = transaction.objectStore(storeName);
        return store.clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get cache status
  async getCacheStatus(): Promise<any> {
    try {
      const pendingOperations = await this.getPendingOperations();
      const cachedFiles = await this.getCachedFiles();
      const cachedProjects = await this.getCachedProjects();
      const lastSync = await this.getOfflineData('lastSync');

      return {
        isOnline: this.isOnline(),
        pendingOperations: pendingOperations.length,
        cachedFiles: cachedFiles.length,
        cachedProjects: cachedProjects.length,
        lastSync,
      };
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return {
        isOnline: this.isOnline(),
        pendingOperations: 0,
        cachedFiles: 0,
        cachedProjects: 0,
        lastSync: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get all cached files
  private async getCachedFiles(): Promise<any[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction(['cached-files'], 'readonly');
      const store = transaction.objectStore('cached-files');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Notify service worker update
  private notifyServiceWorkerUpdate(): void {
    // Dispatch custom event for service worker update
    window.dispatchEvent(new CustomEvent('serviceWorkerUpdate', {
      detail: { hasUpdate: true }
    }));
  }

  // Notify sync complete
  private notifySyncComplete(syncedOperations: number): void {
    // Dispatch custom event for sync completion
    window.dispatchEvent(new CustomEvent('offlineSyncComplete', {
      detail: { syncedOperations }
    }));
  }

  // Setup online/offline event listeners
  setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      console.log('Back online, starting sync...');
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline, caching enabled');
    });
  }
}

export const offlineService = new OfflineService();