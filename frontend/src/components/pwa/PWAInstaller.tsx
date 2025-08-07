'use client';

import { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

// PWA installer that automatically registers service worker and handles installation
export function PWAInstaller() {
  const { requestPersistentStorage } = usePWA();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify user
                  if (window.confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Request persistent storage
    requestPersistentStorage();

    // Add manifest link if not present
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }

    // Add theme-color meta tag if not present
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      themeColorMeta.content = '#1d4ed8';
      document.head.appendChild(themeColorMeta);
    }

    // Add apple-mobile-web-app meta tags
    const appleMetas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'ACE CRM' },
    ];

    appleMetas.forEach(meta => {
      if (!document.querySelector(`meta[name="${meta.name}"]`)) {
        const metaTag = document.createElement('meta');
        metaTag.name = meta.name;
        metaTag.content = meta.content;
        document.head.appendChild(metaTag);
      }
    });

  }, [requestPersistentStorage]);

  return null; // This component doesn't render anything
}