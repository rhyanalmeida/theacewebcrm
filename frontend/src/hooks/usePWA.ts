'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isStandalone: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<void>;
  clearCache: () => Promise<void>;
  updateServiceWorker: () => Promise<void>;
  requestPersistentStorage: () => Promise<boolean>;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    isStandalone: false,
    installPrompt: null,
  });

  useEffect(() => {
    // Check if app is installed/standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && window.navigator.standalone) ||
      document.referrer.includes('android-app://');

    // Check initial online status
    const isOffline = !navigator.onLine;

    setState(prev => ({
      ...prev,
      isStandalone,
      isOffline,
      isInstalled: isStandalone,
    }));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: installEvent,
      }));
    };

    // Listen for app install
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    // Listen for online/offline changes
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = useCallback(async () => {
    if (!state.installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      await state.installPrompt.prompt();
      const choiceResult = await state.installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
      throw error;
    }
  }, [state.installPrompt]);

  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        // Reload the page to get fresh content
        window.location.reload();
      } catch (error) {
        console.error('Error clearing cache:', error);
        throw error;
      }
    }
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          // If there's a waiting worker, tell it to skip waiting
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch (error) {
        console.error('Error updating service worker:', error);
        throw error;
      }
    }
  }, []);

  const requestPersistentStorage = useCallback(async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        return persistent;
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
        return false;
      }
    }
    return false;
  }, []);

  return {
    ...state,
    install,
    clearCache,
    updateServiceWorker,
    requestPersistentStorage,
  };
}

// Hook for managing offline data
export function useOfflineData() {
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    setIsOfflineMode(!navigator.onLine);

    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = useCallback(async (storeName: string, data: any) => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.add({ data, timestamp: Date.now() });
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }, []);

  const getOfflineData = useCallback(async (storeName: string) => {
    if (!('indexedDB' in window)) return [];

    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting offline data:', error);
      return [];
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        try {
          await registration.sync.register('contact-sync');
          await registration.sync.register('lead-sync');
          await registration.sync.register('deal-sync');
        } catch (error) {
          console.error('Error registering background sync:', error);
        }
      }
    }
  }, []);

  return {
    isOfflineMode,
    saveOfflineData,
    getOfflineData,
    syncOfflineData,
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
      
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('leads')) {
        db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('deals')) {
        db.createObjectStore('deals', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('uploads')) {
        db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}