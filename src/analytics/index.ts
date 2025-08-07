/**
 * Analytics System Main Export
 * Comprehensive analytics platform for ACE CRM
 */

// Types
export * from './types';

// Core Services
export { AnalyticsService, analyticsService } from './services/AnalyticsService';
export { ExportService, exportService } from './services/ExportService';
export { PredictiveAnalyticsService, predictiveAnalytics } from './services/PredictiveAnalytics';
export { RealTimeAnalyticsService, MetricsAggregator, realTimeService, metricsAggregator } from './services/RealTimeService';
export { DataWarehouseService, dataWarehouseService } from './services/DataWarehouseService';

// Dashboard Components
export { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
export { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';

// Analysis Components
export { FunnelAnalysis } from './components/funnel/FunnelAnalysis';
export { CohortAnalysis } from './components/cohort/CohortAnalysis';

// Report Builder
export { ReportBuilder } from './components/report-builder/ReportBuilder';

// Utility Functions and Hooks
export const useAnalytics = () => {
  return {
    service: analyticsService,
    export: exportService,
    predictive: predictiveAnalytics,
    realTime: realTimeService,
    dataWarehouse: dataWarehouseService
  };
};

// Analytics Configuration
export interface AnalyticsConfig {
  apiBaseUrl?: string;
  wsUrl?: string;
  enableCache?: boolean;
  cacheTimeout?: number;
  enableRealTime?: boolean;
  maxConcurrentQueries?: number;
}

// Initialize Analytics System
export const initializeAnalytics = (config: AnalyticsConfig = {}) => {
  const {
    apiBaseUrl = '/api/analytics',
    wsUrl = 'ws://localhost:5000/ws/analytics',
    enableCache = true,
    cacheTimeout = 300000, // 5 minutes
    enableRealTime = true,
    maxConcurrentQueries = 10
  } = config;

  // Configure services
  if (enableRealTime) {
    realTimeService.connect().catch(console.error);
  }

  return {
    analyticsService,
    exportService,
    predictiveAnalytics,
    realTimeService,
    dataWarehouseService,
    config: {
      apiBaseUrl,
      wsUrl,
      enableCache,
      cacheTimeout,
      enableRealTime,
      maxConcurrentQueries
    }
  };
};

// Analytics Event System
export class AnalyticsEventBus {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const analyticsEvents = new AnalyticsEventBus();

// Common Analytics Utilities
export const formatters = {
  currency: (value: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(value);
  },

  percentage: (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
  },

  number: (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  },

  compactNumber: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  },

  duration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  },

  dateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  },

  date: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  }
};

// Analytics Colors and Themes
export const analyticsTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
    gray: '#6B7280'
  },
  chartColors: [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ],
  dashboard: {
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    borderColor: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280'
  }
};

// Common Chart Configurations
export const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#374151',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        color: '#F3F4F6'
      }
    },
    y: {
      grid: {
        color: '#F3F4F6'
      }
    }
  }
};

// Analytics Helper Functions
export const helpers = {
  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  },

  /**
   * Calculate compound annual growth rate
   */
  calculateCAGR: (beginningValue: number, endingValue: number, periods: number): number => {
    return (Math.pow(endingValue / beginningValue, 1 / periods) - 1) * 100;
  },

  /**
   * Generate date range array
   */
  generateDateRange: (startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month'): Date[] => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      
      switch (interval) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
    
    return dates;
  },

  /**
   * Group data by time period
   */
  groupByTimePeriod: (data: any[], dateField: string, period: 'day' | 'week' | 'month' | 'year'): Record<string, any[]> => {
    const groups: Record<string, any[]> = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]);
      let key = '';
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    
    return groups;
  },

  /**
   * Calculate moving average
   */
  movingAverage: (data: number[], windowSize: number): number[] => {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(average);
    }
    
    return result;
  },

  /**
   * Detect outliers using IQR method
   */
  detectOutliers: (data: number[]): { outliers: number[]; indices: number[] } => {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outliers: number[] = [];
    const indices: number[] = [];
    
    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        outliers.push(value);
        indices.push(index);
      }
    });
    
    return { outliers, indices };
  }
};

// Export everything as default object for easy importing
export default {
  // Services
  analyticsService,
  exportService,
  predictiveAnalytics,
  realTimeService,
  dataWarehouseService,
  
  // Components
  AnalyticsDashboard,
  ExecutiveDashboard,
  FunnelAnalysis,
  CohortAnalysis,
  ReportBuilder,
  
  // Utilities
  useAnalytics,
  initializeAnalytics,
  analyticsEvents,
  formatters,
  analyticsTheme,
  chartDefaults,
  helpers
};