// Performance optimization utilities for mobile PWA

// Image lazy loading with Intersection Observer
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images = new Set<HTMLImageElement>();

  constructor(options: IntersectionObserverInit = {}) {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
            this.images.delete(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.1,
        ...options
      });
    }
  }

  observe(img: HTMLImageElement) {
    if (!this.observer) {
      this.loadImage(img);
      return;
    }

    this.images.add(img);
    this.observer.observe(img);
  }

  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
  }

  disconnect() {
    this.observer?.disconnect();
    this.images.clear();
  }
}

// Bundle splitting and code splitting utilities
export const loadComponent = async <T>(
  componentImport: () => Promise<{ default: T }>
): Promise<T> => {
  try {
    const module = await componentImport();
    return module.default;
  } catch (error) {
    console.error('Error loading component:', error);
    throw error;
  }
};

// Resource preloading
export const preloadResource = (
  href: string,
  type: 'script' | 'style' | 'image' | 'font' = 'script'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
      case 'font':
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        break;
    }

    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${href}`));
    
    document.head.appendChild(link);
  });
};

// Critical CSS inlining
export const inlineCriticalCSS = (css: string) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observer: PerformanceObserver | null = null;

  constructor() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.duration);
        }
      });

      try {
        this.observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported for some entry types');
      }
    }
  }

  startTiming(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  endTiming(name: string) {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        console.warn('Failed to measure performance:', error);
      }
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics() {
    const result: Record<string, { average: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((values, name) => {
      result[name] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });

    return result;
  }

  getVitalMetrics() {
    if (!('performance' in window)) return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      // Time to Interactive (TTI) approximation
      domInteractive: navigation.domInteractive,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      
      // Paint metrics
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      
      // Connection info
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      downlink: (navigator as any).connection?.downlink || 0,
    };
  }

  disconnect() {
    this.observer?.disconnect();
  }
}

// Memory management utilities
export class MemoryManager {
  private cleanupFunctions: (() => void)[] = [];

  addCleanup(fn: () => void) {
    this.cleanupFunctions.push(fn);
  }

  cleanup() {
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.cleanupFunctions = [];
  }

  getMemoryInfo() {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      };
    }
    return null;
  }
}

// Network-aware loading
export class NetworkAwareLoader {
  private connection: any;

  constructor() {
    this.connection = (navigator as any).connection;
  }

  shouldLoadHighQuality(): boolean {
    if (!this.connection) return true;

    const effectiveType = this.connection.effectiveType;
    const saveData = this.connection.saveData;

    if (saveData) return false;
    
    return effectiveType === '4g';
  }

  getOptimalImageSize(baseWidth: number): number {
    if (!this.connection) return baseWidth;

    const effectiveType = this.connection.effectiveType;
    const saveData = this.connection.saveData;

    if (saveData) return Math.min(baseWidth * 0.5, 400);

    switch (effectiveType) {
      case 'slow-2g':
        return Math.min(baseWidth * 0.3, 200);
      case '2g':
        return Math.min(baseWidth * 0.5, 400);
      case '3g':
        return Math.min(baseWidth * 0.8, 800);
      case '4g':
      default:
        return baseWidth;
    }
  }

  getOptimalVideoQuality(): 'low' | 'medium' | 'high' {
    if (!this.connection) return 'high';

    const effectiveType = this.connection.effectiveType;
    const saveData = this.connection.saveData;

    if (saveData) return 'low';

    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'low';
      case '3g':
        return 'medium';
      case '4g':
      default:
        return 'high';
    }
  }
}

// Cache utilities
export class CacheManager {
  private cacheName = 'ace-crm-dynamic-v1';

  async cacheResource(url: string, response: Response): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cache = await caches.open(this.cacheName);
      await cache.put(url, response.clone());
    } catch (error) {
      console.error('Failed to cache resource:', error);
    }
  }

  async getCachedResource(url: string): Promise<Response | undefined> {
    if (!('caches' in window)) return undefined;

    try {
      const cache = await caches.open(this.cacheName);
      return await cache.match(url);
    } catch (error) {
      console.error('Failed to get cached resource:', error);
      return undefined;
    }
  }

  async clearCache(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

// Viewport utilities for mobile optimization
export const getViewportInfo = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio || 1,
  orientation: screen.orientation?.angle || 0,
  isPortrait: window.innerHeight > window.innerWidth,
  isLandscape: window.innerWidth > window.innerHeight,
});

export const isMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet'];
  return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
         window.innerWidth <= 768;
};

export const isIOS = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod');
};

export const isAndroid = () => {
  return navigator.userAgent.toLowerCase().includes('android');
};

// Touch optimization
export const addTouchFeedback = (element: HTMLElement) => {
  element.addEventListener('touchstart', () => {
    element.style.transform = 'scale(0.98)';
    element.style.opacity = '0.8';
  });

  element.addEventListener('touchend', () => {
    element.style.transform = '';
    element.style.opacity = '';
  });

  element.addEventListener('touchcancel', () => {
    element.style.transform = '';
    element.style.opacity = '';
  });
};

// Create global instances
export const performanceMonitor = new PerformanceMonitor();
export const memoryManager = new MemoryManager();
export const networkAwareLoader = new NetworkAwareLoader();
export const cacheManager = new CacheManager();
export const lazyImageLoader = new LazyImageLoader();