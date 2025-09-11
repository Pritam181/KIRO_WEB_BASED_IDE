const CACHE_NAME = 'kiro-web-v1';
const STATIC_CACHE_NAME = 'kiro-static-v1';
const DYNAMIC_CACHE_NAME = 'kiro-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/files\/.+/,
  /^\/api\/projects\/.+/,
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isStaticFile(request)) {
    event.respondWith(handleStaticFile(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleOtherRequest(request));
  }
});

// Check if request is for a static file
function isStaticFile(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') || 
         url.pathname === '/' || 
         url.pathname === '/index.html' ||
         url.pathname === '/manifest.json';
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Handle static files - cache first strategy
async function handleStaticFile(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving static file from cache', request.url);
      return cachedResponse;
    }
    
    console.log('Service Worker: Fetching static file from network', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to handle static file', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Handle API requests - network first with cache fallback
async function handleAPIRequest(request) {
  try {
    console.log('Service Worker: Fetching API request from network', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request', request.url);
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving API request from cache', request.url);
      
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From-Cache', 'true');
      
      return response;
    }
    
    // Return offline response for file operations
    if (request.url.includes('/api/files/')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Offline - cached data not available',
          offline: true
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Offline': 'true'
          }
        }
      );
    }
    
    throw error;
  }
}

// Handle other requests - network first
async function handleOtherRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('Service Worker: Network failed for other request', request.url);
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for file operations
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'file-sync') {
    event.waitUntil(syncFiles());
  }
});

// Sync files when back online
async function syncFiles() {
  try {
    console.log('Service Worker: Syncing files...');
    
    // Get pending file operations from IndexedDB
    const pendingOperations = await getPendingOperations();
    
    for (const operation of pendingOperations) {
      try {
        await executeFileOperation(operation);
        await removePendingOperation(operation.id);
        console.log('Service Worker: Synced file operation', operation);
      } catch (error) {
        console.error('Service Worker: Failed to sync file operation', operation, error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedOperations: pendingOperations.length
      });
    });
    
  } catch (error) {
    console.error('Service Worker: File sync failed', error);
  }
}

// Get pending operations from IndexedDB
async function getPendingOperations() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kiro-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending-operations'], 'readonly');
      const store = transaction.objectStore('pending-operations');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending-operations')) {
        db.createObjectStore('pending-operations', { keyPath: 'id' });
      }
    };
  });
}

// Execute file operation
async function executeFileOperation(operation) {
  const { method, url, body, headers } = operation;
  
  const response = await fetch(url, {
    method,
    headers: headers || {},
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Remove pending operation from IndexedDB
async function removePendingOperation(operationId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kiro-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending-operations'], 'readwrite');
      const store = transaction.objectStore('pending-operations');
      const deleteRequest = store.delete(operationId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_FILE_OPERATION':
      cacheFileOperation(data);
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    default:
      console.log('Service Worker: Unknown message type', type);
  }
});

// Cache file operation for offline sync
async function cacheFileOperation(operation) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kiro-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pending-operations'], 'readwrite');
      const store = transaction.objectStore('pending-operations');
      
      const operationWithId = {
        ...operation,
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString()
      };
      
      const addRequest = store.add(operationWithId);
      
      addRequest.onsuccess = () => resolve(operationWithId);
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending-operations')) {
        db.createObjectStore('pending-operations', { keyPath: 'id' });
      }
    };
  });
}

// Get cache status
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo[cacheName] = keys.length;
    }
    
    const pendingOperations = await getPendingOperations();
    
    return {
      caches: cacheInfo,
      pendingOperations: pendingOperations.length,
      isOnline: navigator.onLine
    };
  } catch (error) {
    console.error('Service Worker: Failed to get cache status', error);
    return {
      caches: {},
      pendingOperations: 0,
      isOnline: navigator.onLine,
      error: error.message
    };
  }
}