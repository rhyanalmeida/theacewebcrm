'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOfflineData } from './usePWA';

interface SyncData {
  id: string;
  type: 'contact' | 'lead' | 'deal' | 'upload';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

interface BackgroundSyncState {
  pendingItems: SyncData[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
}

export function useBackgroundSync() {
  const { isOfflineMode, saveOfflineData, getOfflineData, syncOfflineData } = useOfflineData();
  const [state, setState] = useState<BackgroundSyncState>({
    pendingItems: [],
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
  });

  // Load pending items from storage
  useEffect(() => {
    loadPendingItems();
  }, []);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      syncPendingItems();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when items are added and online
  useEffect(() => {
    if (state.isOnline && state.pendingItems.length > 0 && !state.isSyncing) {
      syncPendingItems();
    }
  }, [state.isOnline, state.pendingItems.length]);

  const loadPendingItems = async () => {
    try {
      const items = await getOfflineData('sync-queue');
      setState(prev => ({ 
        ...prev, 
        pendingItems: Array.isArray(items) ? items : [] 
      }));
    } catch (error) {
      console.error('Error loading pending sync items:', error);
    }
  };

  const addSyncItem = useCallback(async (
    type: SyncData['type'],
    data: any,
    options: { priority?: boolean } = {}
  ) => {
    const syncItem: SyncData = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    // Add to pending items
    setState(prev => ({
      ...prev,
      pendingItems: options.priority 
        ? [syncItem, ...prev.pendingItems]
        : [...prev.pendingItems, syncItem]
    }));

    // Save to offline storage
    try {
      await saveOfflineData('sync-queue', syncItem);
    } catch (error) {
      console.error('Error saving sync item:', error);
    }

    // If online, try to sync immediately
    if (state.isOnline) {
      syncPendingItems();
    }

    return syncItem.id;
  }, [state.isOnline, saveOfflineData]);

  const syncPendingItems = useCallback(async () => {
    if (state.isSyncing || !state.isOnline || state.pendingItems.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Register background sync if supported
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await Promise.all([
            registration.sync.register('contact-sync'),
            registration.sync.register('lead-sync'),
            registration.sync.register('deal-sync'),
            registration.sync.register('file-upload'),
          ]);
        }
      }

      // Sync items manually
      const results = await syncItemsManually();
      
      setState(prev => ({
        ...prev,
        pendingItems: results.remaining,
        lastSync: new Date(),
      }));

    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isSyncing, state.isOnline, state.pendingItems]);

  const syncItemsManually = async (): Promise<{ remaining: SyncData[] }> => {
    const remaining: SyncData[] = [];
    
    for (const item of state.pendingItems) {
      try {
        setState(prev => ({
          ...prev,
          pendingItems: prev.pendingItems.map(p => 
            p.id === item.id ? { ...p, status: 'syncing' } : p
          )
        }));

        const success = await syncSingleItem(item);
        
        if (success) {
          // Remove from offline storage
          await removeOfflineItem(item.id);
        } else {
          // Increment retry count and add back to queue
          const updatedItem = {
            ...item,
            retryCount: item.retryCount + 1,
            status: item.retryCount >= 3 ? 'failed' as const : 'pending' as const,
          };
          remaining.push(updatedItem);
        }
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
          status: item.retryCount >= 3 ? 'failed' as const : 'pending' as const,
        });
      }
    }

    return { remaining };
  };

  const syncSingleItem = async (item: SyncData): Promise<boolean> => {
    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = item.data;

      switch (item.type) {
        case 'contact':
          endpoint = '/api/contacts';
          break;
        case 'lead':
          endpoint = '/api/leads';
          break;
        case 'deal':
          endpoint = '/api/deals';
          break;
        case 'upload':
          endpoint = '/api/files/upload';
          method = 'POST';
          // Convert back to FormData for file uploads
          body = createFormDataFromItem(item);
          break;
        default:
          throw new Error(`Unknown sync type: ${item.type}`);
      }

      const headers: HeadersInit = {};
      if (item.type !== 'upload') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        body,
      });

      return response.ok;
    } catch (error) {
      console.error('Error syncing single item:', error);
      return false;
    }
  };

  const createFormDataFromItem = (item: SyncData): FormData => {
    const formData = new FormData();
    
    if (item.data.file) {
      // Convert base64 back to file if needed
      if (typeof item.data.file === 'string') {
        const byteString = atob(item.data.file.split(',')[1]);
        const mimeString = item.data.file.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const file = new File([ab], item.data.fileName || 'upload', { type: mimeString });
        formData.append('file', file);
      } else {
        formData.append('file', item.data.file);
      }
    }

    if (item.data.metadata) {
      formData.append('metadata', JSON.stringify(item.data.metadata));
    }

    return formData;
  };

  const removeOfflineItem = async (id: string) => {
    // Remove from IndexedDB - this is a simplified version
    // In a real implementation, you'd use a proper IndexedDB query
    try {
      const db = await openDB();
      const transaction = db.transaction(['sync-queue'], 'readwrite');
      const store = transaction.objectStore('sync-queue');
      await store.delete(id);
    } catch (error) {
      console.error('Error removing offline item:', error);
    }
  };

  const retrySyncItem = useCallback(async (id: string) => {
    const item = state.pendingItems.find(p => p.id === id);
    if (!item || item.status === 'syncing') return;

    setState(prev => ({
      ...prev,
      pendingItems: prev.pendingItems.map(p =>
        p.id === id ? { ...p, status: 'pending', retryCount: 0 } : p
      )
    }));

    if (state.isOnline) {
      syncPendingItems();
    }
  }, [state.pendingItems, state.isOnline, syncPendingItems]);

  const clearSyncItem = useCallback(async (id: string) => {
    setState(prev => ({
      ...prev,
      pendingItems: prev.pendingItems.filter(p => p.id !== id)
    }));

    await removeOfflineItem(id);
  }, []);

  const clearAllSyncItems = useCallback(async () => {
    setState(prev => ({
      ...prev,
      pendingItems: []
    }));

    try {
      const db = await openDB();
      const transaction = db.transaction(['sync-queue'], 'readwrite');
      const store = transaction.objectStore('sync-queue');
      await store.clear();
    } catch (error) {
      console.error('Error clearing all sync items:', error);
    }
  }, []);

  return {
    ...state,
    addSyncItem,
    syncPendingItems,
    retrySyncItem,
    clearSyncItem,
    clearAllSyncItems,
  };
}

// Helper function to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ace-crm-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id' });
      }
    };
  });
}

// Hook for contact sync
export function useContactSync() {
  const { addSyncItem } = useBackgroundSync();

  const syncContact = useCallback(async (contactData: any) => {
    return addSyncItem('contact', contactData);
  }, [addSyncItem]);

  return { syncContact };
}

// Hook for lead sync
export function useLeadSync() {
  const { addSyncItem } = useBackgroundSync();

  const syncLead = useCallback(async (leadData: any) => {
    return addSyncItem('lead', leadData);
  }, [addSyncItem]);

  return { syncLead };
}

// Hook for deal sync
export function useDealSync() {
  const { addSyncItem } = useBackgroundSync();

  const syncDeal = useCallback(async (dealData: any) => {
    return addSyncItem('deal', dealData);
  }, [addSyncItem]);

  return { syncDeal };
}

// Hook for file upload sync
export function useFileUploadSync() {
  const { addSyncItem } = useBackgroundSync();

  const syncFileUpload = useCallback(async (file: File, metadata?: any) => {
    // Convert file to base64 for storage
    const fileData = await fileToBase64(file);
    
    return addSyncItem('upload', {
      file: fileData,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      metadata,
    }, { priority: true });
  }, [addSyncItem]);

  return { syncFileUpload };
}

// Utility function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}